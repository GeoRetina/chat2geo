export interface ChangelogEntry {
  version: string;
  date: string;
  content: string;
}
const appVersion = process.env.NEXT_PUBLIC_APP_VERSION;
export const changelog: ChangelogEntry[] = [
  {
    version: `${appVersion}`,
    date: "2025-02-11",
    content: `

  #### New Features
  - Added support for feature collection ROIs for geospatial analysis.
  - Added address search functionality to the map.
  
  #### Improvements
  - Added better error messages for failed operations.
  - Switched to POST request to handle large payloads when requesting geospatial analysis.
  - Improved the project structure for better maintainability.
  
  #### Bug Fixes
  - Fixed some minor UI issues.
  - Fixed issue with the analysis layers not being centered on the map.
  
      `.trim(),
  },
];
