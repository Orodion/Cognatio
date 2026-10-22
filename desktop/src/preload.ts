import { contextBridge, ipcRenderer } from 'electron';

// The platform layer of the frontend (frontend/src/lib/platform.ts): the app saves files with the "Save as"
// dialog of Windows. The address of the backend is the address of the page, so apiBase stays empty.
contextBridge.exposeInMainWorld('cognatioPlatform', {
  // false: the user cancelled the dialog
  saveFile: async (data: Blob, filename: string): Promise<boolean> =>
    (await ipcRenderer.invoke('cognatio:save-file', await data.arrayBuffer(), filename)) === true,
  // Backup and export: "Save as", then the file goes straight from the backend into it (also above 4 GB)
  downloadTo: (url: string, filename: string): Promise<{ saved: boolean; error?: string }> => ipcRenderer.invoke('cognatio:download-to', url, filename),
  // Reports: the page as printed goes into a PDF file; false: the user cancelled the dialog
  savePdf: async (filename: string): Promise<boolean> => (await ipcRenderer.invoke('cognatio:save-pdf', filename)) === true,
  // "Quit" button of the app: stops the database in order, like closing the window
  quit: (): Promise<void> => ipcRenderer.invoke('cognatio:quit'),
  // Updates of the program (Settings → System): switch, "check now", "restart and install"
  updates: {
    getSettings: () => ipcRenderer.invoke('cognatio:updates-get'),
    setCheck: (check: boolean) => ipcRenderer.invoke('cognatio:updates-set', check),
    setChannel: (channel: 'stable' | 'beta') => ipcRenderer.invoke('cognatio:updates-channel', channel),
    checkNow: () => ipcRenderer.invoke('cognatio:updates-check'),
    installNow: () => ipcRenderer.invoke('cognatio:updates-install'),
  },
});
