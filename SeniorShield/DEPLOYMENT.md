# Deployment Guide

## Prerequisites

1. AWS Account with appropriate permissions
2. AWS CLI installed and configured
3. Node.js 18+ installed on the deployment machine

## Database Setup (AWS RDS)

1. Create a PostgreSQL database instance on AWS RDS:
   ```bash
   aws rds create-db-instance \
     --db-instance-identifier financial-safety-db \
     --db-instance-class db.t3.micro \
     --engine postgres \
     --master-username dbadmin \
     --master-user-password <your-secure-password> \
     --allocated-storage 20 \
     --vpc-security-group-ids <your-security-group> \
     --availability-zone <your-az>
   ```

2. Once the RDS instance is created, note down the endpoint URL. You'll need this for the DATABASE_URL environment variable.

## EC2 Instance Setup

1. Launch an EC2 instance:
   - Amazon Linux 2023 AMI
   - t2.micro or larger instance type
   - Configure security group to allow:
     - SSH (port 22)
     - HTTP (port 80)
     - HTTPS (port 443)
     - Application port (default 3000)

2. Connect to your EC2 instance:
   ```bash
   ssh -i your-key.pem ec2-user@your-instance-ip
   ```

3. Install required software:
   ```bash
   # Update system
   sudo yum update -y

   # Install Node.js
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
   source ~/.bashrc
   nvm install 18
   nvm use 18

   # Install PM2 for process management
   npm install -g pm2
   ```

## Application Deployment

1. Clone the repository:
   ```bash
   git clone <your-repo-url>
   cd <repo-directory>
   ```

2. Create a .env file:
   ```bash
   DATABASE_URL=postgres://dbadmin:<password>@<rds-endpoint>:5432/financial_safety
   NODE_ENV=production
   PORT=3000
   ```

3. Install dependencies and build:
   ```bash
   npm install
   npm run build
   ```

4. Run database migrations:
   ```bash
   npm run db:push
   ```

5. Start the application with PM2:
   ```bash
   pm2 start dist/index.js --name "financial-safety"
   pm2 save
   ```

6. Configure PM2 to start on system boot:
   ```bash
   pm2 startup
   ```

## Setting up NGINX (Optional but recommended)

1. Install NGINX:
   ```bash
   sudo yum install nginx -y
   ```

2. Create NGINX configuration:
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

3. Start NGINX:
   ```bash
   sudo systemctl start nginx
   sudo systemctl enable nginx
   ```

## Environment Variables

Required environment variables:
- DATABASE_URL: PostgreSQL connection string
- NODE_ENV: Set to 'production'
- PORT: Application port (default 3000)

## Monitoring and Maintenance

1. Monitor application logs:
   ```bash
   pm2 logs
   ```

2. Monitor application status:
   ```bash
   pm2 status
   ```

3. Update application:
   ```bash
   git pull
   npm install
   npm run build
   pm2 restart financial-safety
   ```

## Security Considerations

1. Enable AWS WAF for web application protection
2. Set up SSL/TLS certificates using AWS Certificate Manager
3. Regularly update system packages and dependencies
4. Configure AWS Security Groups to limit access
5. Enable AWS CloudWatch for monitoring
6. Set up regular database backups using RDS automated backups

## Troubleshooting

1. Check application logs:
   ```bash
   pm2 logs financial-safety
   ```

2. Check NGINX logs:
   ```bash
   sudo tail -f /var/log/nginx/error.log
   ```

3. Check system logs:
   ```bash
   journalctl -u nginx
   ```