$env:JAVA_HOME="C:\Program Files\Microsoft\jdk-17.0.20.8-hotspot"
$env:ANDROID_HOME="C:\Users\1\AppData\Local\Android\Sdk"

Write-Host "Building Web App..."
npm run build

Write-Host "Syncing with Capacitor..."
npx cap sync android

Write-Host "Patching Java version (VERSION_21 -> VERSION_17) in generated Gradle files..."
$files = @(
    "android\app\capacitor.build.gradle",
    "android\capacitor-cordova-android-plugins\build.gradle"
)
foreach ($file in $files) {
    if (Test-Path $file) {
        (Get-Content $file) -replace 'VERSION_21', 'VERSION_17' | Set-Content $file
        Write-Host "  Patched: $file"
    }
}

Write-Host "Compiling Android App..."
cd android
.\gradlew clean assembleDebug

cd ..
Copy-Item "android\app\build\outputs\apk\debug\app-debug.apk" -Destination "app-debug.apk" -Force
Write-Host "========================================="
Write-Host "✅ APK Build Process Completed!"
Write-Host "File Location: $(Get-Location)\app-debug.apk"
Write-Host "========================================="
