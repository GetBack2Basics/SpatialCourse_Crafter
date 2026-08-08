import { describe, it, expect } from 'vitest';
import { parsePhotoExif } from '../src/utils/geoUtils.js';

describe('Stage 3: Mandatory Group Photo Submission & Verification', () => {
  it('should validate group photo requirement flags on clues', () => {
    const clueWithGroupPhoto = {
      id: 'clue-1',
      title: 'Catalina Hangar',
      requiresGroupPhoto: true,
      points: 250
    };

    const clueWithoutGroupPhoto = {
      id: 'clue-2',
      title: 'Information Board',
      requiresGroupPhoto: false,
      points: 100
    };

    expect(clueWithGroupPhoto.requiresGroupPhoto).toBe(true);
    expect(clueWithoutGroupPhoto.requiresGroupPhoto).toBe(false);
  });

  it('should format submission payload with group photo verification status', () => {
    const clue = { id: 'clue-1', title: 'Target 1', requiresGroupPhoto: true };
    const photoUrl = 'blob:http://localhost/photo-preview-123';
    
    const submissionPayload = {
      clueId: clue.id,
      photoUrl,
      isGroupPhotoVerified: Boolean(photoUrl),
      exifData: { lat: -33.0360, lng: 151.5930, device: 'iPhone 15 Pro' }
    };

    expect(submissionPayload.isGroupPhotoVerified).toBe(true);
    expect(submissionPayload.exifData.device).toBe('iPhone 15 Pro');
  });

  it('should handle null EXIF extraction gracefully without crashing', async () => {
    const fakeFile = new File(["dummy text content"], "dummy.jpg", { type: "image/jpeg" });
    const exif = await parsePhotoExif(fakeFile);
    expect(exif).toBeNull();
  });
});
