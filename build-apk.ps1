$env:JAVA_HOME="C:\Users\1\jdk-17\jdk-17.0.12+7"
$env:PATH="$env:JAVA_HOME\bin;$env:PATH"
$env:ANDROID_HOME="C:\Users\1\AppData\Local\Android\Sdk"

Write-Host "Building Web App..."
npm run build

Write-Host "Syncing with Capacitor..."
npx cap sync android

Write-Host "Patching Java version (VERSION_21 -> VERSION_17) in generated Gradle files..."
$files = @(
    "android\app\capacitor.build.gradle",
    "android\capacitor-cordova-android-plugins\build.gradle",
    "android\build.gradle",
    "android\app\build.gradle",
    "node_modules\@capacitor\android\capacitor\build.gradle"
)
foreach ($file in $files) {
    if (Test-Path $file) {
        (Get-Content $file) -replace 'VERSION_21', 'VERSION_17' | Set-Content $file
        Write-Host "  Patched: $file"
    }
}
Get-ChildItem -Path "node_modules" -Recurse -Filter "build.gradle" -ErrorAction SilentlyContinue | ForEach-Object {
    $c = Get-Content $_.FullName -Raw
    if ($c -match "VERSION_21") {
        $c.Replace("VERSION_21", "VERSION_17") | Set-Content $_.FullName -NoNewline
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
