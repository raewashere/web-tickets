import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EventAddressPickerComponent } from './event-address-picker.component';

describe('EventAddressPickerComponent', () => {
  let component: EventAddressPickerComponent;
  let fixture: ComponentFixture<EventAddressPickerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EventAddressPickerComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(EventAddressPickerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should emit address change when address is updated', () => {
    jest.spyOn(component.addressChange, 'emit');
    component.address = 'Av. Reforma 222, CDMX';
    component.onAddressManualChange();
    expect(component.addressChange.emit).toHaveBeenCalledWith('Av. Reforma 222, CDMX');
  });

  it('should clear address when clearAddress is called', () => {
    jest.spyOn(component.addressChange, 'emit');
    component.address = 'Old address';
    component.clearAddress();
    expect(component.address).toBe('');
    expect(component.addressChange.emit).toHaveBeenCalledWith('');
  });

  it('should use venue location when available', () => {
    jest.spyOn(component.addressChange, 'emit');
    jest.spyOn(component.coordinatesChange, 'emit');

    component.selectedVenue = {
      id: 'v-1',
      name: 'Auditorio Nacional',
      address: 'Paseo de la Reforma 50',
      latitude: 19.4246,
      longitude: -99.1928,
      map_url: null,
      verified: true,
      created_at: '',
      created_by: null,
      updated_at: '',
      updated_by: null,
      venue_configurations: [],
    };

    component.useVenueLocation();

    expect(component.address).toBe('Paseo de la Reforma 50');
    expect(component.addressChange.emit).toHaveBeenCalledWith('Paseo de la Reforma 50');
    expect(component.coordinatesChange.emit).toHaveBeenCalledWith({
      lat: 19.4246,
      lng: -99.1928,
    });
  });

  it('should apply city preset coordinates', () => {
    jest.spyOn(component.coordinatesChange, 'emit');
    component.applyPreset({ name: 'Guadalajara', lat: 20.6597, lng: -103.3496 });
    expect(component.currentLat()).toBe(20.6597);
    expect(component.currentLng()).toBe(-103.3496);
    expect(component.coordinatesChange.emit).toHaveBeenCalledWith({
      lat: 20.6597,
      lng: -103.3496,
    });
  });
});
