ALTER TABLE categories ADD COLUMN schema JSONB;

UPDATE categories SET schema = '{"fields":[
  {"key":"resistance_value","label":"Resistance","placeholder":"e.g. 10","type":"number","isValue":true},
  {"key":"resistance_unit","label":"Unit","placeholder":"Ω / kΩ / MΩ","type":"text"},
  {"key":"footprint","label":"Footprint","placeholder":"0805","type":"text"},
  {"key":"tolerance_percent","label":"Tolerance %","placeholder":"1","type":"number"},
  {"key":"power_rating_watts","label":"Power (W)","placeholder":"0.125","type":"number"}
]}' WHERE name = 'Resistor';

UPDATE categories SET schema = '{"fields":[
  {"key":"capacitance_value","label":"Capacitance","placeholder":"100","type":"number","isValue":true},
  {"key":"capacitance_unit","label":"Unit","placeholder":"pF / nF / µF","type":"text"},
  {"key":"footprint","label":"Footprint","placeholder":"0603","type":"text"},
  {"key":"voltage_rating_v","label":"Voltage (V)","placeholder":"50","type":"number"},
  {"key":"dielectric","label":"Dielectric","placeholder":"X7R","type":"text"}
]}' WHERE name = 'Capacitor';

UPDATE categories SET schema = '{"fields":[
  {"key":"type","label":"Type","placeholder":"Schottky / Zener / Fast","type":"text","isValue":true},
  {"key":"footprint","label":"Package","placeholder":"SOD-123","type":"text"},
  {"key":"forward_voltage_v","label":"Vf (V)","placeholder":"0.3","type":"number"},
  {"key":"max_current_a","label":"Imax (A)","placeholder":"1.0","type":"number"}
]}' WHERE name = 'Diode';

UPDATE categories SET schema = '{"fields":[
  {"key":"color","label":"Color","placeholder":"Red / Green / Blue","type":"text","isValue":true},
  {"key":"footprint","label":"Package","placeholder":"0805","type":"text"},
  {"key":"forward_voltage_v","label":"Vf (V)","placeholder":"2.0","type":"number"},
  {"key":"max_current_a","label":"Imax (A)","placeholder":"0.02","type":"number"}
]}' WHERE name = 'LED';

UPDATE categories SET schema = '{"fields":[
  {"key":"package","label":"Package","placeholder":"SOIC-8","type":"text","isValue":true},
  {"key":"pin_count","label":"Pins","placeholder":"8","type":"number"},
  {"key":"logic_family","label":"Family","placeholder":"74HC","type":"text"},
  {"key":"protocol","label":"Protocol","placeholder":"I2C / SPI","type":"text"}
]}' WHERE name = 'IC';

UPDATE categories SET schema = '{"fields":[
  {"key":"type","label":"Type","placeholder":"NPN / PNP / N-MOSFET","type":"text","isValue":true},
  {"key":"footprint","label":"Package","placeholder":"SOT-23","type":"text"},
  {"key":"max_voltage_v","label":"Vmax (V)","placeholder":"30","type":"number"},
  {"key":"max_current_a","label":"Imax (A)","placeholder":"0.1","type":"number"}
]}' WHERE name = 'Transistor';

UPDATE categories SET schema = '{"fields":[
  {"key":"type","label":"Type","placeholder":"JST-XH / Dupont / USB-C","type":"text","isValue":true},
  {"key":"pin_count","label":"Pins","placeholder":"4","type":"number"},
  {"key":"pitch_mm","label":"Pitch (mm)","placeholder":"2.54","type":"number"}
]}' WHERE name = 'Connector';

UPDATE categories SET schema = '{"fields":[
  {"key":"function","label":"Function","placeholder":"ESP32 / Motor Driver","type":"text","isValue":true},
  {"key":"protocol","label":"Protocol","placeholder":"UART / I2C","type":"text"},
  {"key":"voltage_v","label":"Voltage (V)","placeholder":"3.3","type":"number"}
]}' WHERE name = 'Module';
