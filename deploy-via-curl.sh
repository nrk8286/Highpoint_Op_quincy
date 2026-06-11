#!/bin/bash

# Load service account and get access token
SERVICE_ACCOUNT_FILE="./serviceAccountKey.json"
PROJECT_ID=$(jq -r '.project_id' "$SERVICE_ACCOUNT_FILE")
PRIVATE_KEY=$(jq -r '.private_key' "$SERVICE_ACCOUNT_FILE")
CLIENT_EMAIL=$(jq -r '.client_email' "$SERVICE_ACCOUNT_FILE")

echo "Project ID: $PROJECT_ID"
echo "Client Email: $CLIENT_EMAIL"

# Create JWT
HEADER=$(echo -n '{"alg":"RS256","typ":"JWT"}' | base64 | tr '+/' '-_' | tr -d '=')
NOW=$(date +%s)
EXP=$((NOW + 3600))

PAYLOAD=$(echo -n "{
  \"iss\":\"$CLIENT_EMAIL\",
  \"scope\":\"https://www.googleapis.com/auth/cloud-platform\",
  \"aud\":\"https://oauth2.googleapis.com/token\",
  \"exp\":$EXP,
  \"iat\":$NOW
}" | base64 | tr '+/' '-_' | tr -d '=')

# Sign JWT
SIGNATURE=$(echo -n "${HEADER}.${PAYLOAD}" | openssl dgst -sha256 -sign <(echo "$PRIVATE_KEY") | base64 | tr '+/' '-_' | tr -d '=')
JWT="${HEADER}.${PAYLOAD}.${SIGNATURE}"

echo "JWT created, length: ${#JWT}"

# Get access token
TOKEN_RESPONSE=$(curl -s -X POST "https://oauth2.googleapis.com/token" \
  -d "grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=$JWT")

ACCESS_TOKEN=$(echo "$TOKEN_RESPONSE" | jq -r '.access_token')

if [ -z "$ACCESS_TOKEN" ] || [ "$ACCESS_TOKEN" = "null" ]; then
  echo "Failed to get access token"
  echo "Response: $TOKEN_RESPONSE"
  exit 1
fi

echo "Access token obtained"

# Read Firestore rules
RULES_CONTENT=$(cat ./firestore.rules)

# Create ruleset
RULESET_PAYLOAD=$(jq -n --arg rules "$RULES_CONTENT" '{
  source: {
    files: [
      {
        name: "firestore.rules",
        content: $rules
      }
    ]
  }
}')

echo "Deploying ruleset..."

RULESET_RESPONSE=$(curl -s -X POST \
  "https://firebaserules.googleapis.com/v1/projects/$PROJECT_ID/rulesets" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$RULESET_PAYLOAD")

RULESET_ID=$(echo "$RULESET_RESPONSE" | jq -r '.name')

if [ -z "$RULESET_ID" ] || [ "$RULESET_ID" = "null" ]; then
  echo "Failed to create ruleset"
  echo "Response: $RULESET_RESPONSE"
  exit 1
fi

echo "Ruleset created: $RULESET_ID"

# Release the ruleset
RELEASE_PAYLOAD=$(jq -n --arg ruleset_id "$RULESET_ID" '{
  rulesetId: ($ruleset_id | split("/") | .[-1])
}')

echo "Releasing ruleset..."

RELEASE_RESPONSE=$(curl -s -X PATCH \
  "https://firebaserules.googleapis.com/v1/projects/$PROJECT_ID/releases/cloud.firestore" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$RELEASE_PAYLOAD")

echo "Release response: $RELEASE_RESPONSE"

RELEASE_ID=$(echo "$RELEASE_RESPONSE" | jq -r '.name // empty')

if [ -z "$RELEASE_ID" ]; then
  echo "Failed to release ruleset"
  exit 1
fi

echo "✅ Firestore rules deployed successfully!"
echo "Release: $RELEASE_ID"
