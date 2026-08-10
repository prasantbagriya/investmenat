$env:JAVA_HOME="C:\Program Files\Microsoft\jdk-17.0.19.10-hotspot"
$env:ANDROID_HOME="C:\Users\1\AppData\Local\Android\Sdk"

npx cap sync android

$files = @(
    "android\app\capacitor.build.gradle",
    "android\capacitor-cordova-android-plugins\build.gradle",
    "android\app\build.gradle"
)
foreach ($file in $files) {
    if (Test-Path $file) {
        (Get-Content $file) -replace 'VERSION_21', 'VERSION_17' | Set-Content $file
        Write-Host "Patched: $file"
    }
}

cd android
.\gradlew assembleDebug

cd ..
Copy-Item "android\app\build\outputs\apk\debug\app-debug.apk" -Destination "app-debug.apk" -Force
git add app-debug.apk
git commit -m "Updated APK with Native BTC and UI fixes"
git push
