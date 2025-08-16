# EverKeep Backend API

A scalable Node.js backend API built with TypeScript, Express, Prisma, and MongoDB.

## 🚀 Features

- **MongoDB Database** with Prisma ORM
- **JWT Authentication** with bcrypt password hashing
- **File Upload** to Cloudinary
- **Rate Limiting** and security middleware
- **Comprehensive Logging** with Winston
- **API Documentation** with Swagger
- **Soft Delete** functionality with `deletedAt` columns
- **TypeScript** for type safety

## 🛠️ Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: MongoDB with Prisma ORM
- **Authentication**: JWT + bcrypt
- **File Storage**: Cloudinary
- **Language**: TypeScript
- **Logging**: Winston
- **Documentation**: Swagger/OpenAPI

## 📋 Prerequisites

- Node.js 18+ 
- MongoDB (local or MongoDB Atlas)
- npm or yarn

## 🔧 Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd client
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Update `.env` with your configuration:
   ```env
   DATABASE_URL="mongodb://localhost:27017/everkeep"
   JWT_SECRET="your-super-secret-jwt-key"
   CLOUDINARY_CLOUD_NAME="your-cloud-name"
   CLOUDINARY_API_KEY="your-api-key"
   CLOUDINARY_API_SECRET="your-api-secret"
   ```

4. **Set up MongoDB**
   - **Local**: Install MongoDB and start the service
   - **Atlas**: Create a cluster and get your connection string

5. **Generate Prisma client**
   ```bash
   npm run db:generate
   ```

6. **Push schema to database**
   ```bash
   npm run db:push
   ```

## 🚀 Running the Application

### Development
```bash
npm run dev
```

### Production
```bash
npm run build
npm start
```

## 🗄️ Database Schema

### Models with Soft Delete

- **User**: Authentication and profile data
- **Contact**: User contacts with relationships
- **Vault**: Secure storage containers
- **VaultEntry**: Messages and media files
- **VaultRecipient**: Access control for vaults
- **Notification**: User notifications

All models include:
- `createdAt`: Creation timestamp
- `updatedAt`: Last update timestamp  
- `deletedAt`: Soft delete timestamp (null = active)

## 🔐 API Endpoints

- **Auth**: `/api/v1/auth/*`
- **Users**: `/api/v1/users/*`
- **Contacts**: `/api/v1/contacts/*`
- **Vaults**: `/api/v1/vaults/*`
- **Media**: `/api/v1/media/*`
- **Health**: `/api/v1/health`

## 📚 API Documentation

Once running, visit: `http://localhost:3000/api/v1/docs`

## 🧪 Testing

```bash
npm test
npm run test:watch
```

## 🗃️ Database Commands

```bash
# Generate Prisma client
npm run db:generate

# Push schema changes
npm run db:push

# Reset database (careful!)
npm run db:reset

# Open Prisma Studio
npm run db:studio
```

## 🌐 Deployment

### Render
1. Connect your GitHub repository
2. Set environment variables in Render dashboard
3. Build command: `npm install && npm run build`
4. Start command: `node dist/server.js`

### Environment Variables for Production
- `DATABASE_URL`: MongoDB connection string
- `JWT_SECRET`: Long, random secret key
- `NODE_ENV`: Set to "production"
- `PORT`: Port number (Render sets this automatically)

## 🔒 Security Features

- JWT authentication
- Password hashing with bcrypt
- Rate limiting
- CORS protection
- Helmet security headers
- Input validation
- Soft delete (data recovery possible)

## 📝 Logging

- **Development**: Console and file logging
- **Production**: File rotation with daily logs
- **Levels**: error, warn, info, debug

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.
