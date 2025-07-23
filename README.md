[Public Documentation](https://d0dzs.github.io/improved-giggle/)

~~❗ Currently updating the JSON5 file every hour till I find a solution to update every minute or so. ❗~~
<br />
~~#### EDIT: Using Cloudflare Workers to update the JSON5 file every minute.~~
#### EDIT: Sadly via CF, the response is 403 Forbidden. :(

# Hungarian Train Data Fetcher 🚂

This repository automatically fetches real-time vehicle position data from the Hungarian Railway (MÁV) system every minute and saves it to `train.json5` for public access.

## 📊 Data Source

The data is fetched from MÁV's real-time GraphQL API and includes:
- Train positions (latitude/longitude)
- Vehicle heading and speed
- Trip information (route names, destinations)
- Stop relationships and delays
- Real-time arrival/departure times

## 🗂️ Data Structure

The `train.json5` file contains:
```json
{
  "metadata": {
    "fetch_time": "2025-07-21T10:30:00Z",
    "source": "Hungarian Railway (MÁV) Real-time API",
    "vehicle_count": 145
  },
  "data": {
    "data": {
      "vehiclePositions": [
        {
          "vehicleId": "...",
          "lat": 47.497912,
          "lon": 19.040235,
          "heading": 180,
          "speed": 50,
          "trip": { ... },
          "stopRelationship": { ... }
        }
      ]
    }
  }
}
```

## 🔄 Update Schedule

- **Automatic**: Every minute via GitHub Actions
- **Manual**: Can be triggered manually through GitHub Actions
- **On Push**: Runs when the script is updated

## 🚀 Setup Instructions

1. **Fork this repository**

2. **Enable GitHub Actions** (if not already enabled)
   - Go to your repository settings
   - Navigate to Actions → General
   - Ensure actions are enabled

3. **Set up permissions** (usually automatic)
   - The workflow needs `contents: write` permission to commit files
   - This is typically granted automatically to `GITHUB_TOKEN`

4. **Files to include in your repository:**
   - `index.py` - The main Python script
   - `.github/workflows/fetch-train-data.yml` - GitHub Actions workflow
   - `requirements.txt` - Python dependencies
   - `README.md` - This documentation

## 📁 File Access

Once running, you can access the latest data at:
```
https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO_NAME/main/train.json5
```
[Click here to open the json5 fiel](https://raw.githubusercontent.com/D0dzs/improved-giggle/main/train.json5)

## 🛠️ Local Development

To run locally:
```bash
pip install -r requirements.txt
python fetch_train_data.py
```

## ⚙️ Configuration

The script fetches data for the following transport modes:
- `RAIL` - Regular trains
- `RAIL_REPLACEMENT_BUS` - Bus services replacing trains
- `SUBURBAN_RAILWAY` - Suburban rail services
- `TRAMTRAIN` - Tram-trains
- `COACH` - Long-distance buses

Geographic bounds cover most of Hungary:
- Southwest: 45.457°N, 15.663°E
- Northeast: 48.768°N, 22.563°E

## 📝 Notes

- Data updates every minute during GitHub Actions execution
- The workflow includes error handling and only commits when data changes
- Artifacts are kept for 7 days as backup
- The script respects the original API headers and rate limits

## ⚠️ Important Considerations

1. **Rate Limiting**: Running every minute may be aggressive. Consider reducing frequency if you encounter issues.

2. **Repository Size**: The file will be committed every minute when data changes, which could grow your repository size over time. Consider:
   - Using GitHub's artifact system for storage instead of committing
   - Implementing data retention policies
   - Using external storage (S3, etc.) if needed

3. **API Terms**: Ensure compliance with MÁV's API terms of service.

## 📊 Monitoring

The workflow logs:
- ✅ Successful completions
- 📊 File size information
- 🚂 Update timestamps
- Error messages if issues occur

Check the Actions tab in your GitHub repository to monitor execution.
