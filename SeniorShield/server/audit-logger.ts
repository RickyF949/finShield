import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';

interface AuditLogEntry {
  timestamp: string;
  userId: number;
  action: string;
  ip: string;
  userAgent: string;
}

class AuditLogger {
  private logPath: string;
  private logStream: fs.WriteStream;

  constructor() {
    // Create logs directory if it doesn't exist
    const logsDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir);
    }

    this.logPath = path.join(logsDir, 'audit.log');
    this.logStream = fs.createWriteStream(this.logPath, { flags: 'a' });
  }

  public log(entry: Omit<AuditLogEntry, 'timestamp'>) {
    const logEntry: AuditLogEntry = {
      timestamp: new Date().toISOString(),
      ...entry
    };

    // Hash IP address for privacy
    logEntry.ip = this.hashIdentifier(logEntry.ip);

    // Write to log file
    this.logStream.write(JSON.stringify(logEntry) + '\n');

    // Also log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[Audit]', logEntry);
    }
  }

  private hashIdentifier(identifier: string): string {
    return createHash('sha256')
      .update(identifier + process.env.HASH_SALT || '')
      .digest('hex');
  }

  public async getRecentLogs(userId: number, limit: number = 100): Promise<AuditLogEntry[]> {
    return new Promise((resolve, reject) => {
      const logs: AuditLogEntry[] = [];
      
      fs.createReadStream(this.logPath)
        .on('data', (chunk) => {
          const lines = chunk.toString().split('\n');
          for (const line of lines) {
            if (!line) continue;
            try {
              const entry = JSON.parse(line);
              if (entry.userId === userId) {
                logs.push(entry);
              }
            } catch (e) {
              console.error('Error parsing log line:', e);
            }
          }
        })
        .on('end', () => {
          // Sort by timestamp descending and limit results
          resolve(logs
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .slice(0, limit)
          );
        })
        .on('error', reject);
    });
  }

  public async searchLogs(criteria: {
    userId?: number;
    action?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<AuditLogEntry[]> {
    return new Promise((resolve, reject) => {
      const logs: AuditLogEntry[] = [];
      
      fs.createReadStream(this.logPath)
        .on('data', (chunk) => {
          const lines = chunk.toString().split('\n');
          for (const line of lines) {
            if (!line) continue;
            try {
              const entry = JSON.parse(line);
              const timestamp = new Date(entry.timestamp);
              
              // Apply filters
              if (criteria.userId && entry.userId !== criteria.userId) continue;
              if (criteria.action && !entry.action.includes(criteria.action)) continue;
              if (criteria.startDate && timestamp < criteria.startDate) continue;
              if (criteria.endDate && timestamp > criteria.endDate) continue;
              
              logs.push(entry);
            } catch (e) {
              console.error('Error parsing log line:', e);
            }
          }
        })
        .on('end', () => {
          // Sort by timestamp descending
          resolve(logs.sort((a, b) => 
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          ));
        })
        .on('error', reject);
    });
  }
}

export const auditLog = new AuditLogger();