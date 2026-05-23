import cron from 'node-cron';
import { renewAllWatches } from '../services/sync-pipeline.js';

export function startWatchRenewalJob(): void {
  cron.schedule('0 3 */6 * *', () => {
    console.log('Running Gmail watch renewal job...');
    void renewAllWatches();
  });
}
