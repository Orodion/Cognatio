import { gql } from '@apollo/client';

/** Changes the log level of the server (applies until it restarts) */
export const SET_LOG_LEVEL = gql`
  mutation SetLogLevel($level: String!) {
    setLogLevel(level: $level)
  }
`;

/** Size limits of export/import and backup files (megabytes) */
export const SIZE_LIMITS = gql`
  query SizeLimits {
    sizeLimits {
      importMb
      backupMb
      defaultMb
      minMb
      maxMb
    }
  }
`;

/** Changes the size limits; they apply at once */
export const SET_SIZE_LIMITS = gql`
  mutation SetSizeLimits($importMb: Int!, $backupMb: Int!) {
    setSizeLimits(importMb: $importMb, backupMb: $backupMb) {
      importMb
      backupMb
      defaultMb
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
