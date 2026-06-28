import { googleAuthService, isMockGoogleEnabled } from './googleAuthService';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';

const BACKUP_FOLDER = 'EazyBilling_Backups';

export interface DriveSnapshot {
  id: string;
  name: string;
  createdTime: string;
  size?: string;
}

// Simulates network connection error toggle for diagnostic verification
let simulateNetworkError = false;

export const setSimulateNetworkError = (val: boolean) => {
  simulateNetworkError = val;
};

export const isSimulateNetworkError = () => simulateNetworkError;

const getMockDriveFiles = (): DriveSnapshot[] => {
  const cached = localStorage.getItem('eb_mock_drive_files');
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (e) {
      // fallback
    }
  }

  // Pre-populate with typical database snapshots for step evaluation
  const initialMocks: DriveSnapshot[] = [
    {
      id: "mock-drive-file-101",
      name: "eb_snapshot_mock_2026-05-20_10-30-00.json",
      createdTime: "2026-05-20T10:30:00.000Z",
      size: "15360" // 15 KB
    },
    {
      id: "mock-drive-file-102",
      name: "eb_snapshot_mock_2026-05-22_14-15-22.json",
      createdTime: "2026-05-22T14:15:22.000Z",
      size: "24576" // 24 KB
    },
    {
      id: "mock-drive-file-103",
      name: "eb_snapshot_mock_2026-05-23_09-02-10.json",
      createdTime: "2026-05-23T09:02:10.000Z",
      size: "32768" // 32 KB
    }
  ];

  localStorage.setItem('eb_mock_drive_files', JSON.stringify(initialMocks));
  return initialMocks;
};

export const GoogleDriveService = {
  // Ensure we have an active access token
  getValidToken: async (): Promise<string> => {
    if (isMockGoogleEnabled()) {
      if (simulateNetworkError) {
        throw new Error("Net connection check karein, sync fail hua.");
      }
      return 'mock-active-token';
    }

    const token = await googleAuthService.getAccessToken();
    if (!token) {
      throw new Error("Google Drive se connect nahi kiya gaya hai ya session expire ho chuka hai. Kripya login karein.");
    }
    return token;
  },

  // Check if EazyBilling_Backups exists, if not create it
  ensureFolderExists: async (): Promise<string> => {
    if (isMockGoogleEnabled()) {
      if (simulateNetworkError) {
        throw new Error("Net connection check karein, sync fail hua.");
      }
      return 'mock-folder-id-eb';
    }

    const token = await GoogleDriveService.getValidToken();

    // Search for existing folder
    const searchUrl = `https://www.googleapis.com/drive/v3/files?q=name='${BACKUP_FOLDER}' and mimeType='application/vnd.google-apps.folder' and trashed=false&fields=files(id)`;
    const searchRes = await fetch(searchUrl, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!searchRes.ok) {
      const errorMsg = await searchRes.text();
      throw new Error(`Google Drive search fail ho gaya: ${errorMsg}`);
    }

    const searchData = await searchRes.json();
    if (searchData.files && searchData.files.length > 0) {
      return searchData.files[0].id;
    }

    // Folder doesn't exist, let's create it
    console.log("Creating back up folder on Google Drive...");
    const createUrl = 'https://www.googleapis.com/drive/v3/files';
    const createRes = await fetch(createUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: BACKUP_FOLDER,
        mimeType: 'application/vnd.google-apps.folder'
      })
    });

    if (!createRes.ok) {
      const errorMsg = await createRes.text();
      throw new Error(`Google Drive Folder create karne mein galti: ${errorMsg}`);
    }

    const createData = await createRes.json();
    return createData.id;
  },

  // Read snapshot from storage & upload to Drive
  uploadSnapshotToDrive: async (filename: string): Promise<{ success: boolean; message: string }> => {
    try {
      if (isMockGoogleEnabled()) {
        if (simulateNetworkError) {
          throw new Error("Net connection check karein, sync fail hua.");
        }
        
        // Simulating upload network latency of 3 seconds
        await new Promise((resolve) => setTimeout(resolve, 3100));

        // Add this snapshot to our mock files in localStorage so it dynamically manifests in index list
        const currentList = getMockDriveFiles();
        const existsIndex = currentList.findIndex(f => f.name === filename);
        
        const newMockFile: DriveSnapshot = {
          id: `mock-drive-file-${Date.now()}`,
          name: filename,
          createdTime: new Date().toISOString(),
          size: "45056" // simulated 44 KB
        };

        if (existsIndex >= 0) {
          currentList[existsIndex] = newMockFile;
        } else {
          currentList.unshift(newMockFile);
        }

        localStorage.setItem('eb_mock_drive_files', JSON.stringify(currentList));

        return {
          success: true,
          message: `Google Drive par backup safal raha!`
        };
      }

      const token = await GoogleDriveService.getValidToken();
      const folderId = await GoogleDriveService.ensureFolderExists();

      // Read snapshot file data
      let compressedData: string | null = null;
      try {
        const file = await Filesystem.readFile({
          path: `${BACKUP_FOLDER}/${filename}`,
          directory: Directory.Documents,
          encoding: Encoding.UTF8
        });
        if (typeof file.data === 'string') {
          compressedData = file.data;
        }
      } catch (nativeErr) {
        console.warn("Could not read native backup, searching local storage fallback index...", nativeErr);
        try {
          const list = JSON.parse(localStorage.getItem('eb_browser_snapshots') || '[]');
          const found = list.find((item: any) => item.filename === filename);
          if (found) {
            compressedData = found.data;
          }
        } catch (lsErr) {}
      }

      if (!compressedData) {
        return {
          success: false,
          message: `Snapshot file '${filename}' ko read nahi kiya ja saka.`
        };
      }

      // Perform a Multipart Upload to set metadata and payload contents in a single call
      const boundary = 'eb_multipart_sync_boundary';
      const delimiter = `\r\n--${boundary}\r\n`;
      const closeDelimiter = `\r\n--${boundary}--`;

      const metadata = {
        name: filename,
        parents: [folderId],
        mimeType: 'application/json'
      };

      const multipartBody =
        delimiter +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        compressedData +
        closeDelimiter;

      const uploadUrl = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
      const uploadRes = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': `multipart/related; boundary=${boundary}`
        },
        body: multipartBody
      });

      if (!uploadRes.ok) {
        const errorMsg = await uploadRes.text();
        throw new Error(`Google Drive upload failure: ${errorMsg}`);
      }

      return {
        success: true,
        message: `Google Drive upload safal raha! file '${filename}' backup folder mein save ho gayee hai.`
      };

    } catch (e: any) {
      console.error("Google Drive Upload Error: ", e);
      return {
        success: false,
        message: e.message || `Google Drive upload fail ho gaya: ${e}`
      };
    }
  },

  // Fetch list of snapshots in GDrive folder for potential recovery
  listDriveSnapshots: async (): Promise<DriveSnapshot[]> => {
    try {
      if (isMockGoogleEnabled()) {
        if (simulateNetworkError) {
          throw new Error("Net connection check karein, sync fail hua.");
        }
        await new Promise(resolve => setTimeout(resolve, 800));
        return getMockDriveFiles();
      }

      const token = await GoogleDriveService.getValidToken();
      const folderId = await GoogleDriveService.ensureFolderExists();

      const listUrl = `https://www.googleapis.com/drive/v3/files?q='${folderId}' in parents and trashed=false&fields=files(id,name,createdTime,size)&orderBy=createdTime desc`;
      const res = await fetch(listUrl, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!res.ok) {
        const errorMsg = await res.text();
        throw new Error(`Google Drive list retrieve fail: ${errorMsg}`);
      }

      const data = await res.json();
      return (data.files || []).filter((f: any) => f.name.startsWith('eb_snapshot_') && f.name.endsWith('.json'));
    } catch (e: any) {
      console.error("Google Drive List error: ", e);
      throw e;
    }
  },

  // Download raw file content using fileId from Google Drive
  downloadSnapshotFromDrive: async (fileId: string): Promise<string> => {
    if (isMockGoogleEnabled()) {
      if (simulateNetworkError) {
        throw new Error("Net connection check karein, sync fail hua.");
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Return a simulated structured JSON layout suitable for local restore parsing verification
      return JSON.stringify({
        version: "2.1.0",
        timestamp: Date.now(),
        dataset: "mock_integrity_dataset_restored_over_google_drive",
        companies: [],
        items: [],
        invoices: []
      });
    }

    const token = await GoogleDriveService.getValidToken();
    const downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
    
    const res = await fetch(downloadUrl, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!res.ok) {
      const errorMsg = await res.text();
      throw new Error(`File download fail ho gaya Google Drive se: ${errorMsg}`);
    }

    return await res.text();
  }
};
