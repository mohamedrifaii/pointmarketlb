# Deployment Instructions for MongoDB Atlas Setup

## MongoDB Atlas Setup

### Step 1: Create a MongoDB Atlas Account
1. Visit [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Click on 'Sign Up' and follow the prompts to create an account.

### Step 2: Create a Cluster
1. After logging in, click on 'Build a Cluster'.
2. Choose your cloud provider, region, and cluster tier according to your needs.
3. Click 'Create Cluster'.
4. Wait for the cluster to be created (this may take a few minutes).

### Step 3: Create Database User
1. In the Atlas dashboard, navigate to the 'Database Access' tab.
2. Click on 'Add New Database User'.
3. Enter a username and password for the database user. Select the appropriate privileges (Read and Write to any database).
4. Click 'Add User'.

### Step 4: Configure IP Access List
1. Navigate to the 'Network Access' tab.
2. Click 'Add IP Address'.
3. You can add your current IP address or allow access from anywhere (not recommended for production).
4. Click 'Confirm'.

### Step 5: Retrieve Connection String
1. Go back to the 'Clusters' tab.
2. Click on 'Connect' for your cluster.
3. Choose 'Connect your application'.
4. Copy the connection string and replace the placeholders:
   - `<db_user>`: your database username
   - `<db_password>`: your database password
   - `<cluster>`: your cluster name (e.g., `mycluster`)
   - `<db_name>`: your database name
   - **Format:** mongodb+srv://<db_user>:<db_password>@<cluster>.mongodb.net/<db_name>?retryWrites=true&w=majority

## Render Web Service Setup

### Step 1: Create a New Project on Render
1. Go to [Render](https://render.com) and sign in.
2. Click on 'New' and select 'Web Service'.
3. Connect to your GitHub account if prompted.

### Step 2: Configure the Service
1. Select the repository `mohamedrifaii/pointmarketlb`.
2. Specify the root directory as `backend`.
3. Set the build command: `npm install`.
4. Set the start command: `npm start`.

### Step 3: Set Environment Variables
1. In the service dashboard, navigate to 'Environment' settings.
2. Add the necessary environment variables (e.g., `MONGODB_URI` with the connection string).

### Step 4: Deploy the Service
1. Click on 'Create Web Service'.
2. Render will build and deploy your service. You can monitor the progress in the dashboard.

## Smoke Tests
1. **Health Check:**
   - Endpoint: `/api/health`
   - Method: `GET`

2. **Load Test:**
   - Endpoint: `/`
   - Method: `GET`

3. **Login Flow Test:**
   - Endpoint: `/login`
   - Method: `POST` with credentials.

4. **Admin Dashboard Access:**
   - Endpoint: `/admin`
   - Method: `GET`

5. **Admin Users Management:**
   - Endpoint: `/admin/users`
   - Method: `GET`

Ensure to run these tests after deployment to verify that everything is functioning correctly.