$env:JAVA_HOME="C:\Program Files\Android\Android Studio\jbr"
$env:ANDROID_HOME="C:\Users\1\AppData\Local\Android\Sdk"

Write-Host "Compiling Android App..."
cd android
.\gradlew assembleDebug

cd ..
Copy-Item "android\app\build\outputs\apk\debug\app-debug.apk" -Destination "app-debug.apk" -Force
Write-Host "========================================="
Write-Host "✅ APK Build Process Completed!"
Write-Host "File Location: $(Get-Location)\app-debug.apk"
Write-Host "========================================="
