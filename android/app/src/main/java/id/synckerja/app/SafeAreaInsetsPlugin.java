package id.synckerja.app;

import android.app.Activity;
import android.view.View;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "SafeAreaInsets")
public class SafeAreaInsetsPlugin extends Plugin {

    @PluginMethod
    public void getInsets(PluginCall call) {
        try {
            Activity activity = (Activity) getContext();
            View decorView = activity.getWindow().getDecorView();
            WindowInsetsCompat insets = ViewCompat.getRootWindowInsets(decorView);

            if (insets != null) {
                resolveWithInsets(call, insets);
            } else {
                // Insets not ready yet. Retry after layout, then again after a short delay.
                decorView.post(() -> {
                    WindowInsetsCompat retry = ViewCompat.getRootWindowInsets(decorView);
                    if (retry != null) {
                        resolveWithInsets(call, retry);
                        return;
                    }
                    decorView.postDelayed(() -> {
                        WindowInsetsCompat retry2 = ViewCompat.getRootWindowInsets(decorView);
                        if (retry2 != null) {
                            resolveWithInsets(call, retry2);
                        } else {
                            resolveZero(call);
                        }
                    }, 150);
                });
            }
        } catch (Exception e) {
            call.reject("Failed to get safe area insets", e);
        }
    }

    private void resolveZero(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("top", 0);
        ret.put("bottom", 0);
        call.resolve(ret);
    }

    private void resolveWithInsets(PluginCall call, WindowInsetsCompat insets) {
        int top = insets.getInsets(WindowInsetsCompat.Type.statusBars()).top;
        int bottom = insets.getInsets(WindowInsetsCompat.Type.navigationBars()).bottom;
        JSObject ret = new JSObject();
        ret.put("top", top);
        ret.put("bottom", bottom);
        call.resolve(ret);
    }
}
