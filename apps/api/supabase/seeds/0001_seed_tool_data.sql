-- Optional seed for quick demo.
-- Execute after migrations.

insert into public.tool_datasets (name, description)
values
  ('faqs', 'Preguntas frecuentes generales de la concesionaria'),
  ('catalogo', 'Resumen del catalogo de vehiculos'),
  ('agenda', 'Disponibilidad de citas con asesores')
on conflict (name) do update
set description = excluded.description,
    updated_at = now();

insert into public.tool_records (id, dataset_name, title, content, tags)
values
  ('faq-1', 'faqs', 'Horario de atencion', 'Lunes a sabado de 8:00 a 18:00.', array['horario']),
  ('faq-2', 'faqs', 'Financiamiento', 'Hay opciones de financiamiento para clientes asalariados e independientes.', array['financiamiento']),
  ('faq-3', 'faqs', 'Garantia', 'Los vehiculos nuevos incluyen garantia estandar del fabricante.', array['garantia']),
  ('car-1', 'catalogo', 'Sedan LX 2026', 'Desde GTQ 149900. Disponible en blanco, gris y negro.', array['sedan']),
  ('car-2', 'catalogo', 'SUV XT 2026', 'Desde GTQ 214500. SUV familiar con paquete de seguridad.', array['suv']),
  ('car-3', 'catalogo', 'Pickup Pro 2025', 'Desde GTQ 239200. Ideal para uso mixto en ciudad y trabajo.', array['pickup']),
  ('slot-1', 'agenda', 'Lunes 10:00', 'Asesora Ana Morales disponible para pruebas de manejo.', array['cita']),
  ('slot-2', 'agenda', 'Martes 15:00', 'Asesor Carlos Perez disponible para consulta de financiamiento.', array['cita']),
  ('slot-3', 'agenda', 'Miercoles 11:30', 'Asesora Daniela Ruiz disponible para asesoria general de ventas.', array['cita'])
on conflict (id) do update
set dataset_name = excluded.dataset_name,
    title = excluded.title,
    content = excluded.content,
    tags = excluded.tags,
    updated_at = now();

