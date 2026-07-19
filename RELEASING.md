# Releasing a signed APK

The [`Release Android APK`](.github/workflows/release.yml) workflow builds a
**signed** release APK and publishes it as a GitHub Release. It needs a signing
keystore, provided through repository secrets. You create the keystore once and
keep it safe — the same key must sign every future update.

## 1. Create a keystore (one time)

```bash
keytool -genkeypair -v \
  -keystore bpmn-android-release.jks \
  -alias bpmn-android \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -storepass 'CHOOSE_A_STORE_PASSWORD' \
  -keypass  'CHOOSE_A_KEY_PASSWORD' \
  -dname "CN=BPMN Android, O=kimchaily, C=DE"
```

> **Keep `bpmn-android-release.jks` and its passwords safe and private.** If you
> lose them you cannot ship updates under the same app signature. Never commit
> the keystore — `*.keystore` and `*.jks` are gitignored.

## 2. Add the secrets

The workflow reads four repository secrets. Set them via the GitHub UI
(**Settings → Secrets and variables → Actions → New repository secret**) or the
CLI:

```bash
# base64-encode the keystore (Linux shown; on macOS use: base64 -i file)
base64 -w0 bpmn-android-release.jks | gh secret set ANDROID_KEYSTORE_BASE64

gh secret set ANDROID_KEYSTORE_PASSWORD --body 'CHOOSE_A_STORE_PASSWORD'
gh secret set ANDROID_KEY_ALIAS         --body 'bpmn-android'
gh secret set ANDROID_KEY_PASSWORD      --body 'CHOOSE_A_KEY_PASSWORD'
```

| Secret | Value |
| --- | --- |
| `ANDROID_KEYSTORE_BASE64` | base64 of `bpmn-android-release.jks` |
| `ANDROID_KEYSTORE_PASSWORD` | the store password |
| `ANDROID_KEY_ALIAS` | `bpmn-android` |
| `ANDROID_KEY_PASSWORD` | the key password |

## 3. Cut a release

Tag a version and push it:

```bash
git tag v1.0.0
git push origin v1.0.0
```

The workflow builds, signs, and attaches `bpmn-android-1.0.0.apk` to a new
**v1.0.0** GitHub Release. The version name comes from the tag; the version code
is the workflow run number. You can also trigger it from the **Actions** tab
(**Run workflow**) and type a version by hand.

## Installing / updating

Download the APK from the Release page and open it on the phone (allow
"install from unknown sources"). Because every release is signed with the same
key, Android installs updates over the top without uninstalling.

## Play Store (optional)

For Google Play, switch the build to an **App Bundle** (`bundleRelease`,
producing `app-release.aab`) and enroll in Play App Signing. The same keystore
and secrets apply; only the Gradle task and uploaded artifact change.
