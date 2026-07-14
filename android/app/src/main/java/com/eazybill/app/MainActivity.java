package com.eazybill.app;

import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
    }

    @Override
    public void onStart() {
        super.onStart();
        WebView webView = this.bridge.getWebView();
        if (webView != null) {
            float fontScale = getResources().getConfiguration().fontScale;
            WebSettings settings = webView.getSettings();
            settings.setTextZoom((int) (fontScale * 100));
        }
    }
}
