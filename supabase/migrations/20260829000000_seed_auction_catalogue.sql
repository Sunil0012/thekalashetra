-- Seed three visible auction sessions and their catalogue lots.
-- Safe to run more than once: sessions and lots are keyed by stable IDs/numbers.

INSERT INTO public.auction_sessions (id, title, slug, description, status, mode, starts_at, ends_at)
VALUES
  ('a1000000-0000-0000-0000-000000000001', 'Modern Masters Collection', 'modern-masters-collection', 'A curated selection of modern Indian masters.', 'live', 'long', now() - interval '2 days', now() + interval '5 days'),
  ('a1000000-0000-0000-0000-000000000002', 'Contemporary Voices', 'contemporary-voices', 'Emerging and established contemporary artists.', 'live', 'long', now() - interval '1 day', now() + interval '6 days'),
  ('a1000000-0000-0000-0000-000000000003', 'Works on Paper & Prints', 'works-on-paper-prints', 'Watercolours, drawings, lithographs, and limited edition prints.', 'live', 'long', now(), now() + interval '7 days')
ON CONFLICT (id) DO NOTHING;

CREATE UNIQUE INDEX IF NOT EXISTS lots_session_lot_number_key
  ON public.lots (session_id, lot_number);

INSERT INTO public.lots (session_id, lot_number, artist, title, year, medium, category, image_url, starting_bid, current_bid, bid_count, status)
VALUES
  ('a1000000-0000-0000-0000-000000000001', 1, 'F.N. Souza', 'Head of a Woman', 1962, 'Oil on canvas', 'Painting', 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=800&h=800&fit=crop', 250000, 275000, 3, 'active'),
  ('a1000000-0000-0000-0000-000000000001', 2, 'S.H. Raza', 'Untitled (Bindu)', 2005, 'Acrylic on canvas', 'Painting', 'https://images.unsplash.com/photo-1594736797933-d0501ba2fe65?w=800&h=800&fit=crop', 180000, 180000, 0, 'active'),
  ('a1000000-0000-0000-0000-000000000001', 3, 'M.F. Husain', 'Horses in Motion', 1998, 'Oil on canvas', 'Painting', 'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=800&h=800&fit=crop', 320000, 350000, 2, 'active'),
  ('a1000000-0000-0000-0000-000000000001', 4, 'Tyeb Mehta', 'Diagonal Series', 1982, 'Oil on canvas', 'Painting', 'https://images.unsplash.com/photo-1561214115-f2f134cc4912?w=800&h=800&fit=crop', 450000, 480000, 1, 'active'),
  ('a1000000-0000-0000-0000-000000000001', 5, 'V.S. Gaitonde', 'Untitled Composition', 1975, 'Oil on canvas', 'Painting', 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=800&h=800&fit=crop', 500000, 520000, 1, 'active'),
  ('a1000000-0000-0000-0000-000000000001', 6, 'Ram Kumar', 'Cityscape', 1970, 'Oil on canvas', 'Painting', 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=800&h=800&fit=crop', 90000, 90000, 0, 'active'),
  ('a1000000-0000-0000-0000-000000000001', 7, 'Amrita Sher-Gil', 'Self-Portrait', 1931, 'Oil on canvas', 'Painting', 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=800&h=800&fit=crop', 800000, 820000, 1, 'active'),
  ('a1000000-0000-0000-0000-000000000002', 1, 'Bhupen Khakhar', 'The Purchaser', 1995, 'Acrylic on canvas', 'Painting', 'https://images.unsplash.com/photo-1513366433178-e40264e1b258?w=800&h=800&fit=crop', 120000, 135000, 2, 'active'),
  ('a1000000-0000-0000-0000-000000000002', 2, 'Arpita Singh', 'Wish Dream', 2002, 'Watercolour on paper', 'Painting', 'https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?w=800&h=800&fit=crop', 85000, 85000, 0, 'active'),
  ('a1000000-0000-0000-0000-000000000002', 3, 'Nalini Malani', 'In Search of Vanishing Blood', 2001, 'Mixed media on canvas', 'Mixed Media', 'https://images.unsplash.com/photo-1547891654-e66ed7ebb968?w=800&h=800&fit=crop', 150000, 160000, 1, 'active'),
  ('a1000000-0000-0000-0000-000000000002', 4, 'Jitish Kallat', 'Public Notice 2', 2007, 'Installation', 'Mixed Media', 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=800&h=800&fit=crop', 200000, 200000, 0, 'active'),
  ('a1000000-0000-0000-0000-000000000002', 5, 'Subodh Gupta', 'Very Old Moon', 2013, 'Stainless steel, brass', 'Sculpture', 'https://images.unsplash.com/photo-1499781350541-7783f6c6a0c8?w=800&h=800&fit=crop', 180000, 195000, 2, 'active'),
  ('a1000000-0000-0000-0000-000000000002', 6, 'Shilpa Gupta', '100 Handmade Names', 2016, 'Mixed media', 'Mixed Media', 'https://images.unsplash.com/photo-1452587925148-ce544e77e70d?w=800&h=800&fit=crop', 65000, 70000, 1, 'active'),
  ('a1000000-0000-0000-0000-000000000002', 7, 'Raqib Shaw', 'Garden of Earthly Delights IV', 2009, 'Acrylic, oil, enamel on birchwood', 'Painting', 'https://images.unsplash.com/photo-1572947650440-e8a97ef053b2?w=800&h=800&fit=crop', 280000, 300000, 1, 'active'),
  ('a1000000-0000-0000-0000-000000000002', 8, 'Anish Kapoor', 'Untitled (Void)', 2011, 'Stainless steel', 'Sculpture', 'https://images.unsplash.com/photo-1545996124-2dd80f169719?w=800&h=800&fit=crop', 350000, 350000, 0, 'active'),
  ('a1000000-0000-0000-0000-000000000003', 1, 'Abanindranath Tagore', 'Bharat Mata', 1905, 'Watercolour on paper', 'Painting', 'https://images.unsplash.com/photo-1531913764164-f85c3b474500?w=800&h=800&fit=crop', 400000, 420000, 1, 'active'),
  ('a1000000-0000-0000-0000-000000000003', 2, 'Nandalal Bose', 'Himalayas', 1938, 'Watercolour on paper', 'Painting', 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=800&h=800&fit=crop', 200000, 200000, 0, 'active'),
  ('a1000000-0000-0000-0000-000000000003', 3, 'Ganesh Pyne', 'The Wrestler', 1988, 'Watercolour on paper', 'Painting', 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=800&fit=crop', 75000, 80000, 1, 'active'),
  ('a1000000-0000-0000-0000-000000000003', 4, 'Raja Ravi Varma', 'Shakuntala', 1898, 'Lithograph', 'Print', 'https://images.unsplash.com/photo-1582561833407-b95380519868?w=800&h=800&fit=crop', 120000, 130000, 1, 'active'),
  ('a1000000-0000-0000-0000-000000000003', 5, 'M.F. Husain', 'Indian Museum Series', 2000, 'Lithograph, edition of 50', 'Print', 'https://images.unsplash.com/photo-1544967082-d9d25d867d66?w=800&h=800&fit=crop', 45000, 45000, 0, 'active'),
  ('a1000000-0000-0000-0000-000000000003', 6, 'Baskar Barua', 'Untitled Landscape', 1995, 'Drawing, charcoal on paper', 'Drawing', 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=800&h=800&fit=crop', 35000, 38000, 1, 'active'),
  ('a1000000-0000-0000-0000-000000000003', 7, 'Paritosh Sen', 'Kathakali Dancer', 2003, 'Print, edition of 25', 'Print', 'https://images.unsplash.com/photo-1594736797933-d0501ba2fe65?w=800&h=800&fit=crop', 55000, 55000, 0, 'active')
ON CONFLICT (session_id, lot_number) DO NOTHING;
