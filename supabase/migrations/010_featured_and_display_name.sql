-- Add featured flags to tracks and display_name to rasikas

alter table tracks add column featured boolean not null default false;
alter table tracks add column featured_scenarios text[] not null default '{}';

alter table rasikas add column display_name text;
