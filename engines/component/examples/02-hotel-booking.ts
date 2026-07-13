/**
 * Example 02 — Hotel Booking Experience
 *
 * Composes a Booking Experience: SearchForm + DatePicker + Gallery + CTA
 */
import { makeDemoDeps, unwrap, base } from './_helpers.js';
import {
  createComponentUseCase, composeExperienceUseCase, createSlotUseCase, assignSlotUseCase,
  calculateComponentScoreUseCase, createPresetUseCase, applyPresetUseCase,
} from '../src/index.js';

async function main() {
  const deps = makeDemoDeps();

  console.log('▶ Create Booking Experience Component');
  const bookingId = unwrap(await createComponentUseCase(
    { ...base, name: 'Booking Experience', slug: 'booking-experience', tier: 'Experience', componentType: 'Booking' }, deps,
  )).componentId;

  console.log('▶ Create child components');
  const formId = unwrap(await createComponentUseCase(
    { ...base, name: 'Search Form', slug: 'search-form', tier: 'Atomic', componentType: 'Form' }, deps,
  )).componentId;
  const dateId = unwrap(await createComponentUseCase(
    { ...base, name: 'Date Picker', slug: 'date-picker', tier: 'Atomic', componentType: 'DatePicker' }, deps,
  )).componentId;
  const galleryId = unwrap(await createComponentUseCase(
    { ...base, name: 'Gallery', slug: 'gallery', tier: 'Atomic', componentType: 'Gallery' }, deps,
  )).componentId;

  console.log('▶ Create slots');
  const formSlot = unwrap(await createSlotUseCase(
    { ...base, componentId: bookingId, name: 'form', acceptedTypes: ['Form'], isRequired: true }, deps,
  )).slotId;
  const dateSlot = unwrap(await createSlotUseCase(
    { ...base, componentId: bookingId, name: 'date', acceptedTypes: ['DatePicker'], isRequired: true }, deps,
  )).slotId;

  console.log('▶ Assign components to slots');
  unwrap(await assignSlotUseCase({ ...base, slotId: formSlot, componentId: formId }, deps));
  unwrap(await assignSlotUseCase({ ...base, slotId: dateSlot, componentId: dateId }, deps));

  console.log('▶ Compose Booking Experience');
  unwrap(await composeExperienceUseCase(
    { ...base, name: 'Hotel Booking', slug: 'hotel-booking', parentComponentId: bookingId,
      childComponentIds: [formId, dateId, galleryId], slotMapping: { form: formId, date: dateId, gallery: galleryId },
      experienceType: 'Booking' }, deps,
  ));

  console.log('▶ Create Preset');
  const presetId = unwrap(await createPresetUseCase(
    { ...base, componentId: bookingId, name: 'Hotel Preset', frozenProps: { layout: 'vertical' }, frozenTokens: {} }, deps,
  )).presetId;

  console.log('▶ Apply Preset');
  unwrap(await applyPresetUseCase({ ...base, componentId: bookingId, presetId }, deps));

  console.log('▶ Score');
  const score = unwrap(await calculateComponentScoreUseCase({ ...base, componentId: bookingId }, deps));
  console.log(`  Overall: ${score.overall} | Meets Threshold: ${score.meetsThreshold}`);

  console.log('✓ Hotel Booking Example Complete');
}

main().catch(console.error);
