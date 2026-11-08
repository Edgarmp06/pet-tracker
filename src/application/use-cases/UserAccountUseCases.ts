import { IAuthService } from '../../domain/ports/IAuthService';
import { User } from '../../domain/entities/User';

export class UpdateUserProfileUseCase {
  constructor(private authService: IAuthService) {}

  async execute(name: string): Promise<User> {
    return this.authService.updateProfile(name);
  }
}

export class RequestPasswordResetUseCase {
  constructor(private authService: IAuthService) {}

  async execute(email: string): Promise<void> {
    return this.authService.requestPasswordReset(email);
  }
}

export class DeleteAccountUseCase {
  constructor(private authService: IAuthService) {}

  async execute(): Promise<void> {
    return this.authService.deleteAccount();
  }
}
