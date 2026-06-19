package work.highpoints.app;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.webkit.CookieManager;
import android.webkit.WebSettings;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;

import java.util.ArrayList;
import java.util.List;

import zendesk.core.AnonymousIdentity;
import zendesk.core.Zendesk;
import zendesk.support.Support;
import zendesk.support.guide.HelpCenterActivity;
import zendesk.support.request.RequestActivity;
import zendesk.support.requestlist.RequestListActivity;

public class MainActivity extends BridgeActivity {
    private static final String ZENDESK_URL = "https://highpointresidency.zendesk.com";
    private static final String ZENDESK_APP_ID = "9a66f9cb6200f60842f75e3758a19dab462ce5c2155620df";
    private static final String ZENDESK_CLIENT_ID = "mobile_sdk_client_ab7534aebd5fc2aeae9f";
    private static final String ZENDESK_SCHEME = "highpointops";
    private static final String ZENDESK_HOST = "zendesk";
    private static final String ACTION_SUPPORT = "support";
    private static final String ACTION_REQUESTS = "requests";
    private static final String ACTION_HELP_CENTER = "help-center";

    private boolean zendeskInitialized;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        initializeZendesk();
        configurePersistentWebViewStorage();
        handleZendeskIntent(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        initializeZendesk();
        handleZendeskIntent(intent);
    }

    @Override
    public void onPause() {
        CookieManager.getInstance().flush();
        super.onPause();
    }

    @Override
    public void onStop() {
        CookieManager.getInstance().flush();
        super.onStop();
    }

    private void initializeZendesk() {
        if (zendeskInitialized) {
            return;
        }

        Zendesk.INSTANCE.init(this, ZENDESK_URL, ZENDESK_APP_ID, ZENDESK_CLIENT_ID);
        Support.INSTANCE.init(Zendesk.INSTANCE);
        zendeskInitialized = true;
    }

    private boolean handleZendeskIntent(Intent intent) {
        if (intent == null) {
            return false;
        }

        Uri data = intent.getData();
        if (data == null) {
            return false;
        }

        if (!ZENDESK_SCHEME.equalsIgnoreCase(data.getScheme()) || !ZENDESK_HOST.equalsIgnoreCase(data.getHost())) {
            return false;
        }

        String action = safeValue(data.getQueryParameter("action"), ACTION_SUPPORT);
        String category = safeValue(data.getQueryParameter("category"), "bug");
        String name = safeValue(data.getQueryParameter("name"), "");
        String email = safeValue(data.getQueryParameter("email"), "");

        applyIdentity(name, email);

        if (ACTION_REQUESTS.equalsIgnoreCase(action)) {
            openRequestList();
        } else if (ACTION_HELP_CENTER.equalsIgnoreCase(action)) {
            openHelpCenter(category);
        } else {
            openRequestComposer(category);
        }

        return true;
    }

    private void applyIdentity(String name, String email) {
        AnonymousIdentity.Builder builder = new AnonymousIdentity.Builder();
        if (!name.isEmpty()) {
            builder.withNameIdentifier(name);
        }
        if (!email.isEmpty()) {
            builder.withEmailIdentifier(email);
        }

        Zendesk.INSTANCE.setIdentity(builder.build());
    }

    private void openRequestComposer(String category) {
        String subject = subjectForCategory(category);
        String[] tags = tagsForCategory(category);

        RequestActivity.builder()
            .withRequestSubject(subject)
            .withTags(tags)
            .show(this);
    }

    private void openRequestList() {
        RequestListActivity.builder().show(this);
    }

    private void openHelpCenter(String category) {
        if ("access".equalsIgnoreCase(category)) {
            HelpCenterActivity.builder()
                .withLabelNames("access", "permissions", "rbac")
                .show(this);
            return;
        }

        if ("data".equalsIgnoreCase(category)) {
            HelpCenterActivity.builder()
                .withLabelNames("data", "sync", "audit")
                .show(this);
            return;
        }

        HelpCenterActivity.builder().show(this);
    }

    private String subjectForCategory(String category) {
        if ("access".equalsIgnoreCase(category)) {
            return "HighPoints access issue";
        }
        if ("data".equalsIgnoreCase(category)) {
            return "HighPoints data issue";
        }
        if ("question".equalsIgnoreCase(category)) {
            return "HighPoints question";
        }
        return "HighPoints bug report";
    }

    private String[] tagsForCategory(String category) {
        List<String> tags = new ArrayList<>();
        tags.add("highpoints");
        tags.add("mobile");

        if ("access".equalsIgnoreCase(category)) {
            tags.add("access");
            tags.add("permission");
            tags.add("role");
            tags.add("rbac");
        } else if ("data".equalsIgnoreCase(category)) {
            tags.add("data");
            tags.add("sync");
            tags.add("records");
            tags.add("audit");
        } else if ("question".equalsIgnoreCase(category)) {
            tags.add("question");
            tags.add("how-to");
        } else {
            tags.add("bug");
            tags.add("regression");
            tags.add("login");
            tags.add("session");
            tags.add("ui");
        }

        return tags.toArray(new String[0]);
    }

    private String safeValue(String value, String fallback) {
        return value == null ? fallback : value.trim().isEmpty() ? fallback : value.trim();
    }

    private void configurePersistentWebViewStorage() {
        if (getBridge() == null || getBridge().getWebView() == null) {
            return;
        }

        WebView webView = getBridge().getWebView();
        WebSettings settings = webView.getSettings();
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setTextZoom(100);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            settings.setOffscreenPreRaster(true);
        }

        CookieManager cookieManager = CookieManager.getInstance();
        cookieManager.setAcceptCookie(true);
        cookieManager.setAcceptThirdPartyCookies(webView, true);
        cookieManager.flush();
    }
}
