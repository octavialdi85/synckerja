package id.synckerja.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import androidx.core.view.WindowCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    public static final String LIVECHAT_CHANNEL_ID = "livechat";
    public static final String NOTIFICATIONS_CHANNEL_ID = "notifications";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Edge-to-edge MUST be set before super.onCreate() so the window is configured
        // before the WebView is added. Otherwise WindowInsets stay 0 and content is covered.
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        getWindow().setStatusBarColor(Color.TRANSPARENT);
        getWindow().setNavigationBarColor(Color.TRANSPARENT);
        super.onCreate(savedInstanceState);
        createLiveChatNotificationChannel();
        createAppNotificationsChannel();
        registerPlugin(ZoomDisablePlugin.class);
        registerPlugin(SafeAreaInsetsPlugin.class);
        registerPlugin(NoOverscrollPlugin.class);
    }

    private void createLiveChatNotificationChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager nm = getSystemService(NotificationManager.class);
        if (nm == null) return;
        NotificationChannel channel = new NotificationChannel(
            LIVECHAT_CHANNEL_ID,
            "Live Chat",
            NotificationManager.IMPORTANCE_HIGH
        );
        channel.setDescription("Pesan masuk dari Live Chat (WhatsApp, Instagram, Email)");
        channel.enableVibration(true);
        // Custom sound: add notification_livechat.mp3 to res/raw/ and uncomment:
        // Uri soundUri = Uri.parse("android.resource://" + getPackageName() + "/raw/notification_livechat");
        // channel.setSound(soundUri, new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_NOTIFICATION).build());
        nm.createNotificationChannel(channel);
    }

    private void createAppNotificationsChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager nm = getSystemService(NotificationManager.class);
        if (nm == null) return;
        NotificationChannel channel = new NotificationChannel(
            NOTIFICATIONS_CHANNEL_ID,
            "Notifikasi Aplikasi",
            NotificationManager.IMPORTANCE_HIGH
        );
        channel.setDescription("Komentar, persetujuan tugas, dan notifikasi lain");
        channel.enableVibration(true);
        nm.createNotificationChannel(channel);
    }
}
