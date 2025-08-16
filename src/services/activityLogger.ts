import { prisma } from '../config/database';

export class ActivityLogger {
  private static async create(userId: string, title: string, payload: { description: string; type: string; metadata?: Record<string, any> }) {
    try {
      await prisma.notification.create({
        data: {
          userId,
          type: 'email',
          title,
          message: JSON.stringify({
            description: payload.description,
            type: payload.type,
            metadata: payload.metadata || {},
            timestamp: new Date().toISOString(),
          }),
        },
      });
    } catch (err) {
      // Do not block main flow on logging issues
      // Silently fail on logging errors
    }
  }

  static async logLogin(userId: string, details?: { ip?: string; ua?: string; location?: string }) {
    const location = details?.location || details?.ip || 'unknown location';
    return this.create(userId, 'Account accessed', {
      description: `Successful login from ${location}`,
      type: 'login',
      metadata: { ipAddress: details?.ip, userAgent: details?.ua, location: details?.location },
    });
  }

  static async logRegistration(userId: string) {
    return this.create(userId, 'Account created', {
      description: 'Your account has been created successfully',
      type: 'system_event',
    });
  }

  static async logEmailVerified(userId: string) {
    return this.create(userId, 'Email verified', {
      description: 'Your email address has been verified',
      type: 'security_check',
    });
  }

  static async logPasswordResetRequested(userId: string) {
    return this.create(userId, 'Password reset requested', {
      description: 'A password reset request was initiated',
      type: 'security_check',
    });
  }

  static async logPasswordUpdated(userId: string) {
    return this.create(userId, 'Password updated', {
      description: 'Your password was changed successfully',
      type: 'security_check',
    });
  }

  static async logContact(userId: string, action: 'added' | 'updated' | 'deleted', name?: string) {
    const base = name ? `${name}` : 'contact';
    const map: Record<typeof action, { title: string; description: string; type: string }> = {
      added: { title: `Added ${base}`, description: 'New trusted contact added to your network', type: 'contact_added' },
      updated: { title: `Updated ${base}`, description: 'Contact information and settings modified', type: 'contact_updated' },
      deleted: { title: `Removed ${base}`, description: 'Contact removed from your account', type: 'contact_deleted' },
    };
    const cfg = map[action];
    return this.create(userId, cfg.title, { description: cfg.description, type: cfg.type, metadata: { contactName: name } });
  }

  static async logVault(userId: string, action: 'created' | 'updated' | 'deleted', extras?: { vaultId?: string; name?: string }) {
    const vaultName = extras?.name || 'Vault';
    const map: Record<typeof action, { title: string; description: string; type: string }> = {
      created: { title: `Created vault "${vaultName}"`, description: 'New vault created with encryption enabled', type: 'vault_created' },
      updated: { title: `Updated vault "${vaultName}"`, description: 'Vault settings and information modified', type: 'vault_updated' },
      deleted: { title: `Deleted vault "${vaultName}"`, description: 'Vault and its contents moved to recycle', type: 'vault_deleted' },
    };
    const cfg = map[action];
    return this.create(userId, cfg.title, { description: cfg.description, type: cfg.type, metadata: { vaultId: extras?.vaultId, vaultName } });
  }

  static async logEntry(userId: string, action: 'added' | 'deleted', params?: { entryType?: string; vaultId?: string; vaultName?: string; entryId?: string }) {
    const entryType = (params?.entryType || 'entry').toLowerCase();
    const vaultName = params?.vaultName;
    const title = action === 'added'
      ? (vaultName ? `Added ${entryType} to "${vaultName}"` : `Added ${entryType}`)
      : (vaultName ? `Deleted ${entryType} from "${vaultName}"` : `Deleted ${entryType}`);
    const description = action === 'added' ? `New ${entryType} entry added to vault` : `Entry permanently removed from vault`;
    const type = action === 'added' ? 'entry_added' : 'entry_deleted';

    return this.create(userId, title, {
      description,
      type,
      metadata: { vaultId: params?.vaultId, vaultName, entryType: entryType, entryId: params?.entryId },
    });
  }

  static async logRecipient(userId: string, action: 'added' | 'removed', extras?: { vaultId?: string; vaultName?: string; contactId?: string; contactName?: string; vaultRecipientId?: string }) {
    const title = action === 'added'
      ? (extras?.vaultName && extras?.contactName ? `Added ${extras.contactName} to "${extras.vaultName}"` : 'Recipient added')
      : (extras?.contactName && extras?.vaultName ? `Removed ${extras.contactName} from "${extras.vaultName}"` : 'Recipient removed');
    const description = action === 'added' ? 'Contact assigned as recipient for vault delivery' : 'Contact no longer assigned to this vault';
    const type = action === 'added' ? 'recipient_added' : 'recipient_removed';

    return this.create(userId, title, {
      description,
      type,
      metadata: { vaultId: extras?.vaultId, vaultName: extras?.vaultName, contactId: extras?.contactId, contactName: extras?.contactName, vaultRecipientId: extras?.vaultRecipientId },
    });
  }
} 