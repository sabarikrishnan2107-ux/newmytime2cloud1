; Custom NSIS hook for the MyTime2Desktop installer.
;
; The bundled PHP (php.exe / php-cgi.exe) is built with Visual C++ 2019, so it
; needs the VC++ 2015-2019 x64 runtime (vcruntime140.dll / msvcp140.dll) present
; in System32. We install it here, during setup, so the user never has to do a
; separate step and PHP works on first launch.
;
; This installer is per-user (perMachine:false) so it is NOT elevated — but the
; VC++ redist writes to System32 and DOES need admin. So we elevate ONLY the
; redist via ShellExecute "runas" (a single UAC prompt), and we skip it entirely
; when the runtime is already installed so existing machines see no prompt.
;
; vs_redist.exe ships via extraResources, so at install time it lives at
; $INSTDIR\resources\vs_redist.exe.

!macro customInstall
  ; Skip if the runtime is already present (no UAC prompt for machines that have it).
  IfFileExists "$SYSDIR\vcruntime140.dll" 0 m2c_install_redist
  IfFileExists "$SYSDIR\msvcp140.dll" m2c_redist_done m2c_install_redist

  m2c_install_redist:
    DetailPrint "Installing Microsoft Visual C++ Redistributable..."
    ; "runas" raises a UAC prompt so the redist installs with admin rights even
    ; though this per-user installer is not itself elevated. Waits for completion.
    ExecShellWait "runas" "$INSTDIR\resources\vs_redist.exe" "/quiet /norestart"
    DetailPrint "Visual C++ Redistributable installation finished."

  m2c_redist_done:
!macroend
