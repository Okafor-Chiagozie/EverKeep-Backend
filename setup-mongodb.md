# MongoDB Setup Guide

## 🚀 Quick Setup Steps:

### 1. Get MongoDB Connection String
- **MongoDB Atlas** (Recommended): Create free cluster at [mongodb.com](https://mongodb.com)
- **Local MongoDB**: Install MongoDB locally
- **Render MongoDB**: Create MongoDB service in Render dashboard

### 2. Update Environment Variables
In your `.env` file:
```env
DATABASE_URL="mongodb+srv://username:password@cluster.mongodb.net/everkeep?retryWrites=true&w=majority"
```

### 3. Test Connection Locally
```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Push schema to MongoDB
npx prisma db push

# Start development server
npm run dev
```

### 4. Deploy to Render
- **Build Command:** `npm install && npm run build`
- **Start Command:** `node dist/server.js`
- **Environment Variables:** Set `DATABASE_URL` in Render dashboard

## 🔧 MongoDB Connection String Format:
```
mongodb+srv://username:password@cluster.mongodb.net/database_name?retryWrites=true&w=majority
```

## ✅ Benefits of MongoDB:
- **No permission issues** with Prisma generate
- **Easier deployment** on Render
- **Better performance** for document-based data
- **Automatic scaling**

## 🎯 Next Steps:
1. Set up MongoDB database
2. Update `DATABASE_URL` in `.env`
3. Test locally with `npx prisma db push`
4. Deploy to Render
5. Set environment variables in Render dashboard 