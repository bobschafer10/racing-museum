-- Badger Modified Tour SeriesStandings top 10 import

insert into "SeriesStandings" (
  season_id,
  finishing_position,
  driver_name,
  driver_id,
  points,
  starts,
  wins,
  top5,
  top10,
  poles
)
values
  (53, 1, 'Brian Mullen', 27013, null, 7, 1, 5, 6, null),
  (53, 2, 'Mitch McGrath', 41431, null, 7, 3, 5, 6, null),
  (53, 2, 'Jeremy Christians', 35236, null, 7, 0, 1, 2, null),
  (53, 2, 'Lance Arneson', 38902, null, 7, 1, 1, 1, null),
  (53, 2, 'Mike Mullen', 41124, null, 7, 0, 2, 6, null),
  (53, 2, 'Russ Reinwald', 44364, null, 7, 0, 2, 5, null),
  (53, 2, 'Eddie Lemay, Jr.', 32149, null, 6, 0, 0, 2, null),
  (53, 2, 'Jared Siefert', 34503, null, 6, 0, 1, 3, null),
  (53, 2, 'Matt Rechek', 40414, null, 6, 0, 0, 2, null),
  (53, 2, 'Tim Lemirande', 46246, null, 6, 1, 1, 2, null),
  (54, 1, 'Mitch McGrath', 41431, 738, 7, 3, 6, 6, null),
  (54, 2, 'Eric Van Iten', 32360, 676, 7, 0, 5, 5, null),
  (54, 3, 'Craig Priewe', 28907, 653, 7, 0, 2, 5, null),
  (54, 4, 'Eddie Lemay, Jr.', 32149, 602, 6, 0, 2, 4, null),
  (54, 5, 'Benji LaCrosse', 25188, 597, 5, 2, 3, 4, null),
  (54, 6, 'Lance Arneson', 38902, 593, 7, 0, 2, 3, null),
  (54, 7, 'Joe McGrath', 36611, 582, 6, 0, 0, 4, null),
  (54, 8, 'Tim Lemirande', 46246, 572, 5, 1, 2, 2, null),
  (54, 9, 'Brad Lautenbach', 26512, 545, 6, 0, 1, 2, null),
  (54, 10, 'Pat Zdroik', 42038, 543, 6, 0, 0, 3, null);
