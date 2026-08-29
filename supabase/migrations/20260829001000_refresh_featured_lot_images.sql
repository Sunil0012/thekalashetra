-- Refresh the two featured catalogue images with clearer art photography.
UPDATE public.lots
SET image_url = CASE id
  WHEN '3da2fc3d-27f5-44f5-8d69-5cf1513583c3' THEN 'https://images.unsplash.com/photo-1549490349-8643362247b5?w=1200&h=1200&fit=crop'
  WHEN '3cb1d5c8-b0dc-489c-96bb-c42e7365ecea' THEN 'https://images.unsplash.com/photo-1580136579312-94651dfd596d?w=1200&h=1200&fit=crop'
END
WHERE id IN (
  '3da2fc3d-27f5-44f5-8d69-5cf1513583c3',
  '3cb1d5c8-b0dc-489c-96bb-c42e7365ecea'
);
