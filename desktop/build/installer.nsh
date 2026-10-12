; Extra steps of the uninstaller (electron-builder hooks customUnInit / customUnInstall, see electron-builder.yml).
; The uninstaller keeps the data (family trees, photos, backups in %APPDATA%\Cognatio). A user who uninstalls
; interactively is asked whether to remove them too – two confirmations, with a hint to export first.
; A silent uninstall (/S, also the one an update runs) never asks and never deletes; "/S --delete-app-data" is the
; switch for administrators.
; The questions are in the languages of the app (Windows language id in $LANGUAGE, the installer itself is
; multilingual: installerLanguages in electron-builder.yml); every other language gets English. The menu names in the
; hint are taken from the language files of the app (nav.settings > settings.sections.data), the test
; desktop/scripts/installer-texts.test.mjs checks them.

!ifdef BUILD_UNINSTALLER
Var /GLOBAL cognatioWipeData

!macro customUnInit
  StrCpy $R9 "0"
  ${IfNot} ${Silent}
    ${If} $LANGUAGE == 1031
      StrCpy $R7 "Sollen auch alle Daten von Cognatio gelöscht werden (Stammbäume, Personen, Fotos, Dokumente, Sicherungen)?$\r$\n$\r$\nHinweis: Exportieren Sie Ihre Daten vorher in Cognatio unter Einstellungen > Daten und Backup, sonst sind sie unwiderruflich verloren.$\r$\n$\r$\nJa = Daten löschen$\r$\nNein = Daten behalten (empfohlen)$\r$\nAbbrechen = Deinstallation abbrechen, um zuerst zu exportieren"
      StrCpy $R8 "Letzte Bestätigung: Alle Daten von Cognatio werden jetzt unwiderruflich gelöscht. Das lässt sich nicht rückgängig machen.$\r$\n$\r$\nWirklich alle Daten löschen?"
    ${ElseIf} $LANGUAGE == 3082
    ${OrIf} $LANGUAGE == 1034
      StrCpy $R7 "¿Eliminar también todos los datos de Cognatio (árboles genealógicos, personas, fotos, documentos, copias de seguridad)?$\r$\n$\r$\nNota: exporte antes sus datos en Cognatio, en Ajustes > Datos y copias de seguridad; de lo contrario se perderán de forma irreversible.$\r$\n$\r$\nSí = eliminar los datos$\r$\nNo = conservar los datos (recomendado)$\r$\nCancelar = cancelar la desinstalación para exportar antes"
      StrCpy $R8 "Última confirmación: todos los datos de Cognatio se eliminarán ahora de forma irreversible. Esta acción no se puede deshacer.$\r$\n$\r$\n¿Eliminar realmente todos los datos?"
    ${ElseIf} $LANGUAGE == 1036
      StrCpy $R7 "Supprimer aussi toutes les données de Cognatio (arbres généalogiques, personnes, photos, documents, sauvegardes) ?$\r$\n$\r$\nRemarque : exportez d’abord vos données dans Cognatio, sous Paramètres > Données et sauvegarde, sinon elles seront définitivement perdues.$\r$\n$\r$\nOui = supprimer les données$\r$\nNon = conserver les données (recommandé)$\r$\nAnnuler = annuler la désinstallation pour exporter d’abord"
      StrCpy $R8 "Dernière confirmation : toutes les données de Cognatio vont maintenant être supprimées définitivement. Cette action est irréversible.$\r$\n$\r$\nSupprimer vraiment toutes les données ?"
    ${ElseIf} $LANGUAGE == 1040
      StrCpy $R7 "Eliminare anche tutti i dati di Cognatio (alberi genealogici, persone, foto, documenti, backup)?$\r$\n$\r$\nNota: esporta prima i tuoi dati in Cognatio, in Impostazioni > Dati e backup, altrimenti andranno persi definitivamente.$\r$\n$\r$\nSì = elimina i dati$\r$\nNo = conserva i dati (consigliato)$\r$\nAnnulla = annulla la disinstallazione per esportare prima"
      StrCpy $R8 "Ultima conferma: tutti i dati di Cognatio verranno ora eliminati definitivamente. L’operazione non può essere annullata.$\r$\n$\r$\nEliminare davvero tutti i dati?"
    ${ElseIf} $LANGUAGE == 1043
      StrCpy $R7 "Ook alle gegevens van Cognatio verwijderen (stambomen, personen, foto’s, documenten, back-ups)?$\r$\n$\r$\nLet op: exporteer uw gegevens eerst in Cognatio onder Instellingen > Gegevens en back-up, anders gaan ze voorgoed verloren.$\r$\n$\r$\nJa = gegevens verwijderen$\r$\nNee = gegevens behouden (aanbevolen)$\r$\nAnnuleren = verwijdering afbreken om eerst te exporteren"
      StrCpy $R8 "Laatste bevestiging: alle gegevens van Cognatio worden nu definitief verwijderd. Dit kan niet ongedaan worden gemaakt.$\r$\n$\r$\nWerkelijk alle gegevens verwijderen?"
    ${ElseIf} $LANGUAGE == 1045
      StrCpy $R7 "Czy usunąć także wszystkie dane Cognatio (drzewa genealogiczne, osoby, zdjęcia, dokumenty, kopie zapasowe)?$\r$\n$\r$\nUwaga: najpierw wyeksportuj dane w Cognatio w sekcji Ustawienia > Dane i kopie zapasowe, w przeciwnym razie zostaną bezpowrotnie utracone.$\r$\n$\r$\nTak = usuń dane$\r$\nNie = zachowaj dane (zalecane)$\r$\nAnuluj = przerwij odinstalowanie, aby najpierw wyeksportować"
      StrCpy $R8 "Ostateczne potwierdzenie: wszystkie dane Cognatio zostaną teraz bezpowrotnie usunięte. Nie można tego cofnąć.$\r$\n$\r$\nNaprawdę usunąć wszystkie dane?"
    ${ElseIf} $LANGUAGE == 1046
    ${OrIf} $LANGUAGE == 2070
      StrCpy $R7 "Eliminar também todos os dados do Cognatio (árvores genealógicas, pessoas, fotografias, documentos, cópias de segurança)?$\r$\n$\r$\nNota: exporte primeiro os seus dados no Cognatio, em Definições > Dados e cópia de segurança; caso contrário perdem-se definitivamente.$\r$\n$\r$\nSim = eliminar os dados$\r$\nNão = manter os dados (recomendado)$\r$\nCancelar = cancelar a desinstalação para exportar primeiro"
      StrCpy $R8 "Última confirmação: todos os dados do Cognatio serão agora eliminados definitivamente. Não é possível anular esta ação.$\r$\n$\r$\nEliminar mesmo todos os dados?"
    ${ElseIf} $LANGUAGE == 1049
      StrCpy $R7 "Удалить также все данные Cognatio (семейные древа, людей, фотографии, документы, резервные копии)?$\r$\n$\r$\nПримечание: сначала экспортируйте данные в Cognatio в разделе Настройки > Данные и резервные копии, иначе они будут безвозвратно утеряны.$\r$\n$\r$\nДа = удалить данные$\r$\nНет = сохранить данные (рекомендуется)$\r$\nОтмена = прервать удаление, чтобы сначала экспортировать"
      StrCpy $R8 "Последнее подтверждение: все данные Cognatio будут сейчас безвозвратно удалены. Это нельзя отменить.$\r$\n$\r$\nДействительно удалить все данные?"
    ${ElseIf} $LANGUAGE == 1058
      StrCpy $R7 "Видалити також усі дані Cognatio (родинні дерева, людей, фотографії, документи, резервні копії)?$\r$\n$\r$\nПримітка: спершу експортуйте дані в Cognatio в розділі Налаштування > Дані та резервні копії, інакше їх буде втрачено безповоротно.$\r$\n$\r$\nТак = видалити дані$\r$\nНі = зберегти дані (рекомендовано)$\r$\nСкасувати = перервати видалення, щоб спершу експортувати"
      StrCpy $R8 "Остаточне підтвердження: усі дані Cognatio буде зараз безповоротно видалено. Це неможливо скасувати.$\r$\n$\r$\nСправді видалити всі дані?"
    ${Else}
      StrCpy $R7 "Also delete all Cognatio data (family trees, people, photos, documents, backups)?$\r$\n$\r$\nNote: export your data first in Cognatio under Settings > Data and backup, otherwise it is lost for good.$\r$\n$\r$\nYes = delete the data$\r$\nNo = keep the data (recommended)$\r$\nCancel = cancel the uninstallation to export first"
      StrCpy $R8 "Final confirmation: all Cognatio data will now be deleted for good. This cannot be undone.$\r$\n$\r$\nReally delete all data?"
    ${EndIf}
    MessageBox MB_YESNOCANCEL|MB_ICONQUESTION|MB_DEFBUTTON2 "$R7" IDYES cognatioAskAgain IDNO cognatioKeepData
    Quit
    cognatioAskAgain:
    MessageBox MB_YESNO|MB_ICONEXCLAMATION|MB_DEFBUTTON2 "$R8" IDYES cognatioDeleteData IDNO cognatioKeepData
    cognatioDeleteData:
    StrCpy $R9 "1"
    cognatioKeepData:
  ${EndIf}
  StrCpy $cognatioWipeData $R9
!macroend

!macro customUnInstall
  ${If} $cognatioWipeData == "1"
    ; Electron uses the per-user folder, also for an installation for all users
    RMDir /r "$APPDATA\Cognatio"
  ${EndIf}
!macroend
!endif
