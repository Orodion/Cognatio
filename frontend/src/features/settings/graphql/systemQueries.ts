import { gql } from '@apollo/client';

/** Changes the log level of the server (applies until it restarts) */
export const SET_LOG_LEVEL = gql`
  mutation SetLogLevel($level: String!) {
    setLogLevel(level: $level)
  }
`;

/** Optional upper limits of export/import and backup files (megabytes; null: none) */
export const SIZE_LIMITS = gql`
  query SizeLimits {
    sizeLimits {
      importMb
      backupMb
      minMb
      maxMb
    }
  }
`;

/** Changes the size limits (null removes one); they apply at once */
export const SET_SIZE_LIMITS = gql`
  mutation SetSizeLimits($importMb: Int, $backupMb: Int) {
    setSizeLimits(importMb: $importMb, backupMb: $backupMb) {
      importMb
      backupMb
      minMb
      maxMb
    }
  }
`;

/** State of the application for the settings page */
export const SYSTEM_INFO = gql`
  query SystemInfo {
    systemInfo {
      version
      database
      trees
      persons
      deletedPersons
      media
      mediaBytes
      lastImportAt
      lastBackupAt
      backupCount
      backupDir
      logLevel
    }
  }
`;
