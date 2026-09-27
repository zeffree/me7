import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { NumberField, SelectField, SliderField, TextField } from './Fields';

describe('field help and control layout', () => {
  const fields = [
    <TextField label="Name" hint="Customer name" value="" onChange={() => {}} />,
    <NumberField label="Seats" hint="Paid seats only" value={100} onChange={() => {}} />,
    <SelectField label="Currency" hint="No conversion" value="USD" options={[{ value: 'USD', label: 'USD' }]} onChange={() => {}} />,
    <SliderField label="Adoption" hint="Active users" value={50} min={0} max={100} onChange={() => {}} />,
  ];

  it.each(fields.map((field, index) => [index, field] as const))('places field %i help after the control and outside its label', (_, field) => {
    const html = renderToStaticMarkup(field);
    const control = html.search(/<(input|select)\b/);
    const help = html.indexOf('class="field-hint"');
    expect(html.indexOf('</label>')).toBeLessThan(control);
    expect(control).toBeLessThan(help);
    const descriptionId = html.match(/aria-describedby="([^"]+)"/)?.[1];
    expect(descriptionId).toBeTruthy();
    expect(html).toContain(`id="${descriptionId}"`);
  });

  it('does not create a dangling hint reference when no hint is present', () => {
    const html = renderToStaticMarkup(<NumberField label="Annual cost" currency="USD" value={1200} onChange={() => {}} />);
    expect(html).not.toContain('aria-describedby');
    expect(html).toContain('class="number-field"');
  });
});
