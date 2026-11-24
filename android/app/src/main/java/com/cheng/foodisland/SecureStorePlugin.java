package com.cheng.foodisland;

import android.content.Context;
import android.content.SharedPreferences;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;

import androidx.security.crypto.EncryptedSharedPreferences;
import androidx.security.crypto.MasterKey;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.security.KeyStore;

/**
 * API Key 的加密存储（对齐原项目 Fud AI 的做法）：
 * Android Keystore 托管的 AES-256-GCM，写进 EncryptedSharedPreferences。
 *
 * 主密钥损坏时（换机、恢复备份、重装）读写会抛异常，
 * 这里清掉别名并重建，避免整个 App 因为读不到 Key 而崩。
 */
@CapacitorPlugin(name = "SecureStore")
public class SecureStorePlugin extends Plugin {

    private static final String PREFS_NAME = "food_island_secure";

    private SharedPreferences prefs;

    private SharedPreferences open() throws Exception {
        if (prefs != null) return prefs;

        MasterKey masterKey = new MasterKey.Builder(getContext())
                .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
                .build();

        prefs = EncryptedSharedPreferences.create(
                getContext(),
                PREFS_NAME,
                masterKey,
                EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
                EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
        );
        return prefs;
    }

    /** 主密钥失效时的恢复路径：删掉整个 prefs + 主密钥别名，然后重建 */
    private SharedPreferences reset() throws Exception {
        Context context = getContext();
        context.deleteSharedPreferences(PREFS_NAME);

        KeyStore keyStore = KeyStore.getInstance("AndroidKeyStore");
        keyStore.load(null);
        String alias = MasterKey.DEFAULT_MASTER_KEY_ALIAS;
        if (keyStore.containsAlias(alias)) {
            keyStore.deleteEntry(alias);
        }

        prefs = null;
        return open();
    }

    private SharedPreferences prefsWithRecovery() throws Exception {
        try {
            return open();
        } catch (Exception first) {
            return reset();
        }
    }

    @PluginMethod
    public void get(PluginCall call) {
        String key = call.getString("key");
        if (key == null) {
            call.reject("缺少 key");
            return;
        }
        try {
            JSObject result = new JSObject();
            result.put("value", prefsWithRecovery().getString(key, null));
            call.resolve(result);
        } catch (Exception error) {
            call.reject("读取失败：" + error.getMessage());
        }
    }

    @PluginMethod
    public void set(PluginCall call) {
        String key = call.getString("key");
        String value = call.getString("value");
        if (key == null || value == null) {
            call.reject("缺少 key 或 value");
            return;
        }
        try {
            prefsWithRecovery().edit().putString(key, value).apply();
            call.resolve();
        } catch (Exception error) {
            call.reject("写入失败：" + error.getMessage());
        }
    }

    @PluginMethod
    public void remove(PluginCall call) {
        String key = call.getString("key");
        if (key == null) {
            call.reject("缺少 key");
            return;
        }
        try {
            prefsWithRecovery().edit().remove(key).apply();
            call.resolve();
        } catch (Exception error) {
            call.reject("删除失败：" + error.getMessage());
        }
    }
}
