# IQOS Dashboard

A modern, interactive SPA dashboard for managing the IQOS sales network, built with Next.js, Tailwind CSS, and Leaflet.

## Features

- **Interactive Map**: Full-screen OpenStreetMap with custom markers for kiosks.
- **Stock Tracker & Notes**: Click on any kiosk marker to open a side drawer with stock levels and notes.
- **Team Performance**: Track monthly sales goals and visits.
- **Schedule**: View daily tasks and visits.
- **Group Chat**: Simulating real-time team communication.

## Setup Instructions

Since this project was generated with a specific configuration, please follow these steps to get it running:

1.  **Navigate to the project directory**:
    ```bash
    cd iqos-dashboard
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Run the development server**:
    ```bash
    npm run dev
    ```

4.  **Open the dashboard**:
    Visit [http://localhost:3000](http://localhost:3000) in your browser.

## Technologies

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **Map**: React Leaflet / OpenStreetMap
- **Icons**: Lucide React
- **Charts**: Custom CSS progress bars (for lightweight performance)
- **Data Integration**:
  - The application now loads real sales data from `public/data/january.csv` and `public/data/february.csv`.
  - The "Team Performance" section aggregates this data to show per-person statistics.

## Notes

- The data is fetched at runtime from the `public/data` folder.
- You can update `january.csv` or `february.csv` in that folder to see changes in the dashboard.
- The map uses OpenStreetMap tiles which are free to use.
