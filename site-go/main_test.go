package main

import (
	"compress/gzip"
	"encoding/json"
	"html"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestRenderAllPages(t *testing.T) {
	for _, p := range pages {
		body, err := renderPage(p)
		if err != nil {
			t.Fatalf("render %s: %v", p.Path, err)
		}
		text := string(body)
		if !strings.Contains(text, html.EscapeString(p.Title)) {
			t.Fatalf("render %s missing title", p.Path)
		}
		if !strings.Contains(text, "application/ld+json") {
			t.Fatalf("render %s missing schema", p.Path)
		}
		if !strings.Contains(text, `<link rel="canonical"`) {
			t.Fatalf("render %s missing canonical", p.Path)
		}
	}
}

func TestRenderedSchemaJSONIsValid(t *testing.T) {
	page := pageByPath["/readiness-assessment"]
	body, err := renderPage(page)
	if err != nil {
		t.Fatalf("render page: %v", err)
	}
	text := string(body)
	startTag := "<script type=\"application/ld+json\">"
	start := strings.Index(text, startTag)
	if start < 0 {
		t.Fatal("missing json-ld script")
	}
	start += len(startTag)
	end := strings.Index(text[start:], "</script>")
	if end < 0 {
		t.Fatal("missing json-ld close tag")
	}
	var schema map[string]any
	if err := json.Unmarshal([]byte(text[start:start+end]), &schema); err != nil {
		t.Fatalf("schema json invalid: %v", err)
	}
	if schema["description"] != page.Description {
		t.Fatalf("schema description = %#v", schema["description"])
	}
	if schema["url"] != "https://highpoints.work/readiness-assessment" {
		t.Fatalf("schema url = %#v", schema["url"])
	}
}
func TestReadinessPageCallsGoAPI(t *testing.T) {
	page, ok := pageByPath["/readiness-assessment"]
	if !ok {
		t.Fatal("missing readiness assessment page")
	}
	body, err := renderPage(page)
	if err != nil {
		t.Fatalf("render readiness page: %v", err)
	}
	text := string(body)
	for _, needle := range []string{"/api/readiness-score?", "URLSearchParams", "window.fetch", "localVerdict"} {
		if !strings.Contains(text, needle) {
			t.Fatalf("readiness page missing %q", needle)
		}
	}
}

func TestSearchPageAndAPI(t *testing.T) {
	page, ok := pageByPath["/search"]
	if !ok {
		t.Fatal("missing search page")
	}
	body, err := renderPage(page)
	if err != nil {
		t.Fatalf("render search page: %v", err)
	}
	text := string(body)
	for _, needle := range []string{"data-search", "/api/search?q=", "Search facility operations resources"} {
		if !strings.Contains(text, needle) {
			t.Fatalf("search page missing %q", needle)
		}
	}

	mux := newMuxWithRoot(t.TempDir())
	res := httptest.NewRecorder()
	mux.ServeHTTP(res, httptest.NewRequest(http.MethodGet, "/api/search?q=maintenance", nil))
	if res.Code != http.StatusOK {
		t.Fatalf("search status = %d", res.Code)
	}
	var payload struct {
		Results []SearchResult `json:"results"`
	}
	if err := json.Unmarshal(res.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode search json: %v", err)
	}
	if len(payload.Results) == 0 {
		t.Fatal("expected search results")
	}
	found := false
	for _, result := range payload.Results {
		if result.Path == "/facility-maintenance-software" {
			found = true
		}
	}
	if !found {
		t.Fatalf("maintenance page missing from results: %#v", payload.Results)
	}
}

func TestSitemapContainsPublicPages(t *testing.T) {
	s := sitemap()
	for _, path := range []string{
		"/executive-command-center",
		"/ai-operations",
		"/workflow-automation",
		"/readiness-assessment",
		"/integrations",
		"/pricing",
		"/senior-living-operations",
		"/facility-maintenance-software",
		"/survey-readiness",
		"/housekeeping-management",
		"/search",
	} {
		if !strings.Contains(s, "https://highpoints.work"+path) {
			t.Fatalf("sitemap missing %s", path)
		}
	}
}

func TestAppRouteRedirectsToProductionAppEntry(t *testing.T) {
	root := t.TempDir()
	if err := os.MkdirAll(filepath.Join(root, "www"), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(root, "www", "index.html"), []byte("unused fallback"), 0o644); err != nil {
		t.Fatal(err)
	}

	mux := newMuxWithRoot(root)
	app := httptest.NewRecorder()
	mux.ServeHTTP(app, httptest.NewRequest(http.MethodGet, "/app", nil))
	if app.Code != http.StatusTemporaryRedirect {
		t.Fatalf("/app status = %d, want %d", app.Code, http.StatusTemporaryRedirect)
	}
	if got := app.Header().Get("Location"); got != appEntryURL {
		t.Fatalf("/app location = %q", got)
	}

	callback := httptest.NewRecorder()
	mux.ServeHTTP(callback, httptest.NewRequest(http.MethodGet, "/app?code=abc&state=xyz", nil))
	if callback.Code != http.StatusTemporaryRedirect {
		t.Fatalf("/app callback status = %d, want %d", callback.Code, http.StatusTemporaryRedirect)
	}
	if got := callback.Header().Get("Location"); got != appEntryURL+"?code=abc&state=xyz" {
		t.Fatalf("/app callback location = %q", got)
	}

	r := httptest.NewRequest(http.MethodGet, "/signup", nil)
	w := httptest.NewRecorder()
	mainHandler(w, r)
	if w.Code != http.StatusTemporaryRedirect {
		t.Fatalf("/signup status = %d, want %d", w.Code, http.StatusTemporaryRedirect)
	}
	if got := w.Header().Get("Location"); got != appEntryURL {
		t.Fatalf("/signup location = %q", got)
	}
}

func TestMuxServesManifestAndHeaders(t *testing.T) {
	mux := newMux()
	req := httptest.NewRequest(http.MethodGet, "/manifest.json", nil)
	res := httptest.NewRecorder()
	mux.ServeHTTP(res, req)
	if res.Code != http.StatusOK {
		t.Fatalf("manifest status = %d", res.Code)
	}
	if got := res.Header().Get("Content-Type"); !strings.Contains(got, "application/manifest+json") {
		t.Fatalf("manifest content-type = %q", got)
	}
	if !strings.Contains(res.Body.String(), `"start_url": "/app"`) {
		t.Fatal("manifest missing app start_url")
	}
	if got := res.Header().Get("X-Content-Type-Options"); got != "nosniff" {
		t.Fatalf("nosniff header = %q", got)
	}
	if got := res.Header().Get("Content-Security-Policy"); !strings.Contains(got, "frame-ancestors 'none'") {
		t.Fatalf("csp header missing frame-ancestors: %q", got)
	}
}

func TestTrailingSlashRedirectsToCanonicalPath(t *testing.T) {
	r := httptest.NewRequest(http.MethodGet, "/pricing/", nil)
	w := httptest.NewRecorder()
	mainHandler(w, r)
	if w.Code != http.StatusPermanentRedirect {
		t.Fatalf("status = %d, want %d", w.Code, http.StatusPermanentRedirect)
	}
	if got := w.Header().Get("Location"); got != "/pricing" {
		t.Fatalf("location = %q", got)
	}
}

func TestExportIncludesManifestRobotsAndSitemap(t *testing.T) {
	dir := t.TempDir()
	if err := exportSite(dir); err != nil {
		t.Fatalf("export site: %v", err)
	}
	for _, name := range []string{"index.html", "manifest.json", "robots.txt", "sitemap.xml", filepath.Join("pricing", "index.html"), filepath.Join("search", "index.html")} {
		body, err := os.ReadFile(filepath.Join(dir, name))
		if err != nil {
			t.Fatalf("read exported %s: %v", name, err)
		}
		if len(body) == 0 {
			t.Fatalf("exported %s is empty", name)
		}
	}
}

func TestHealthEndpoint(t *testing.T) {
	mux := newMuxWithRoot(t.TempDir())
	req := httptest.NewRequest(http.MethodGet, "/healthz", nil)
	res := httptest.NewRecorder()
	mux.ServeHTTP(res, req)
	if res.Code != http.StatusOK {
		t.Fatalf("health status = %d", res.Code)
	}
	var payload map[string]any
	if err := json.Unmarshal(res.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode health json: %v", err)
	}
	if payload["status"] != "ok" || payload["service"] != "highpoints-go-site" {
		t.Fatalf("unexpected health payload: %#v", payload)
	}
}

func TestReadinessScoreAPI(t *testing.T) {
	mux := newMuxWithRoot(t.TempDir())
	req := httptest.NewRequest(http.MethodGet, "/api/readiness-score?maintenance=100&housekeeping=100&compliance=100&staffing=100", nil)
	res := httptest.NewRecorder()
	mux.ServeHTTP(res, req)
	if res.Code != http.StatusOK {
		t.Fatalf("readiness status = %d", res.Code)
	}
	var payload struct {
		Score   int    `json:"score"`
		Verdict string `json:"verdict"`
	}
	if err := json.Unmarshal(res.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode readiness json: %v", err)
	}
	if payload.Score != 100 || payload.Verdict != "Ready to scale" {
		t.Fatalf("unexpected readiness payload: %#v", payload)
	}
}

func TestIconHandlerServesOnlyWebPFiles(t *testing.T) {
	root := t.TempDir()
	iconDir := filepath.Join(root, "www", "icons")
	if err := os.MkdirAll(iconDir, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(iconDir, "icon-192.webp"), []byte("webp"), 0o644); err != nil {
		t.Fatal(err)
	}
	mux := newMuxWithRoot(root)
	good := httptest.NewRecorder()
	mux.ServeHTTP(good, httptest.NewRequest(http.MethodGet, "/icons/icon-192.webp", nil))
	if good.Code != http.StatusOK {
		t.Fatalf("icon status = %d", good.Code)
	}
	if got := good.Header().Get("Cache-Control"); !strings.Contains(got, "immutable") {
		t.Fatalf("icon cache header = %q", got)
	}
	bad := httptest.NewRecorder()
	mux.ServeHTTP(bad, httptest.NewRequest(http.MethodGet, "/icons/icon-192.png", nil))
	if bad.Code != http.StatusNotFound {
		t.Fatalf("bad icon status = %d", bad.Code)
	}
}

func TestMethodGuardRejectsPost(t *testing.T) {
	mux := newMuxWithRoot(t.TempDir())
	req := httptest.NewRequest(http.MethodPost, "/healthz", nil)
	res := httptest.NewRecorder()
	mux.ServeHTTP(res, req)
	if res.Code != http.StatusMethodNotAllowed {
		t.Fatalf("status = %d, want %d", res.Code, http.StatusMethodNotAllowed)
	}
	if got := res.Header().Get("Allow"); got != "GET, HEAD" {
		t.Fatalf("allow header = %q", got)
	}
}

func TestGzipMiddlewareCompressesJSON(t *testing.T) {
	mux := newMuxWithRoot(t.TempDir())
	req := httptest.NewRequest(http.MethodGet, "/healthz", nil)
	req.Header.Set("Accept-Encoding", "gzip")
	res := httptest.NewRecorder()
	mux.ServeHTTP(res, req)
	if res.Code != http.StatusOK {
		t.Fatalf("status = %d", res.Code)
	}
	if got := res.Header().Get("Content-Encoding"); got != "gzip" {
		t.Fatalf("content-encoding = %q", got)
	}
	reader, err := gzip.NewReader(res.Body)
	if err != nil {
		t.Fatalf("gzip reader: %v", err)
	}
	defer reader.Close()
	body, err := io.ReadAll(reader)
	if err != nil {
		t.Fatalf("read gzip body: %v", err)
	}
	if !strings.Contains(string(body), `"status":"ok"`) {
		t.Fatalf("unexpected gzip body: %s", body)
	}
}

func TestGzipMiddlewareSkipsIcons(t *testing.T) {
	root := t.TempDir()
	iconDir := filepath.Join(root, "www", "icons")
	if err := os.MkdirAll(iconDir, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(iconDir, "icon-192.webp"), []byte("webp"), 0o644); err != nil {
		t.Fatal(err)
	}
	mux := newMuxWithRoot(root)
	req := httptest.NewRequest(http.MethodGet, "/icons/icon-192.webp", nil)
	req.Header.Set("Accept-Encoding", "gzip")
	res := httptest.NewRecorder()
	mux.ServeHTTP(res, req)
	if res.Code != http.StatusOK {
		t.Fatalf("status = %d", res.Code)
	}
	if got := res.Header().Get("Content-Encoding"); got != "" {
		t.Fatalf("icon content-encoding = %q", got)
	}
}

func TestReadinessScoreClampsInputs(t *testing.T) {
	score, verdict := readinessScore(map[string]int{
		"maintenance":  200,
		"housekeeping": 200,
		"compliance":   -10,
		"staffing":     -10,
	})
	if score != 60 {
		t.Fatalf("score = %d, want 60", score)
	}
	if verdict != "High leverage opportunity" {
		t.Fatalf("verdict = %q", verdict)
	}
}
