import { IDroppingRepository } from '../../domain/ports/IDroppingRepository';
import { AsyncStorageDroppingRepository } from '../adapters/AsyncStorageDroppingRepository';

export class RepositoryFactory {
  static getDroppingRepository(isProUser: boolean): IDroppingRepository {
    if (isProUser) {
      // En el futuro, aquí retornarás el adaptador de la nube (Firebase/Supabase)
      return new AsyncStorageDroppingRepository();
    }
    return new AsyncStorageDroppingRepository();
  }
}