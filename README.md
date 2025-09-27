# Supabase Images Debug Tool

A local web application for debugging and viewing processed images from your Supabase database and storage.

## Features

- **Date Range Filtering**: Filter processed images by creation date with custom date ranges
- **Quick Last Day Filter**: One-click button to view images from the last 24 hours
- **Comprehensive Table View**: Display user ID, creation timestamp, task/state, and associated images
- **Image Preview**: View source, result, and profile images directly in the table with click-to-expand functionality
- **Storage Integration**: Automatically fetches images from the 'user-uploads' storage bucket
- **Responsive Design**: Works on both desktop and mobile devices

## Setup

1. **Download the files**: Ensure you have all three files in the same directory:
   - `index.html`
   - `styles.css`
   - `app.js`

2. **Open in browser**: Simply open `index.html` in your web browser

3. **Configure Supabase connection**:
   - On first run, the configuration panel will be visible
   - Enter your Supabase project URL (e.g., `https://your-project.supabase.co`)
   - Enter your Supabase anon key
   - Click "Save Configuration"

## Usage

### Initial Setup
1. **Configure Supabase**: Enter your project URL and anon key in the configuration panel
2. **Set Date Range**: Use the date inputs to specify the time range you want to analyze
3. **Filter Data**: Click "Filter Data" to fetch and display the results

### Quick Actions
- **Last Day Button**: Automatically sets the date range to the last 24 hours
- **Image Preview**: Click on any image thumbnail to view the full-size image in a new tab
- **Configuration**: Click the gear icon (⚙️) to modify your Supabase settings

### Table Columns
- **User ID**: The unique identifier for each user
- **Created At**: Timestamp when the record was created
- **Task/State**: The task or state information from the processed_images table
- **Source Image**: The original uploaded image from `user-id/source/` folder
- **Result Image**: The processed result image from `user-id/result/` folder  
- **Profile Image**: The profile/target image from `user-id/target/` folder (if available)
- **Result URL**: Direct link to the result URL stored in the database

## Database Schema

The tool expects the following Supabase table structure:

```sql
create table public.processed_images (
  id uuid not null default gen_random_uuid (),
  created_at timestamp with time zone not null default now(),
  user_id text null,
  result_url text null,
  task text null,
  constraint processed_images_pkey primary key (id)
);
```

## Storage Structure

The tool expects images to be stored in the 'user-uploads' bucket with the following folder structure:

```
user-uploads/
├── user-id-1/
│   ├── source/
│   │   └── imageXXX.jpg
│   ├── result/
│   │   └── imageXXX.jpg
│   └── target/ (optional)
│       └── imageXXX.jpg
├── user-id-2/
│   ├── source/
│   └── result/
└── ...
```

## Security Notes

- Your Supabase credentials are stored in browser localStorage
- The tool uses signed URLs for image access (1-hour expiry)
- Only the anon key is required (no service role key needed)
- All API calls respect your Supabase Row Level Security (RLS) policies

## Troubleshooting

### No images showing
- Verify your storage bucket is named 'user-uploads'
- Check that your anon key has read permissions for the storage bucket
- Ensure the folder structure matches the expected format

### No data appearing
- Verify your database table is named 'processed_images'
- Check that your anon key has read permissions for the table
- Ensure the date range includes records in your database

### Configuration issues
- Clear your browser's localStorage and reconfigure
- Verify your Supabase URL format (should include https://)
- Check that your anon key is correct and has necessary permissions

## Browser Compatibility

This tool works in all modern browsers that support:
- ES6+ JavaScript features
- CSS Grid and Flexbox
- LocalStorage API
- Fetch API

Recommended browsers: Chrome 60+, Firefox 55+, Safari 12+, Edge 79+

