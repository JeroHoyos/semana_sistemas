// The calendar feed the "add the whole week" link subscribes to, built from ACTIVITIES on every deploy.
// The UIDs never change, so subscribed calendars update the same events (Google refreshes every few hours).
import type { APIRoute } from 'astro';

import { ACTIVITIES } from '@/data/content';

const SITE = 'https://semanasistemas.vercel.app';
const DATES = { wed: '2026-11-18', thu: '2026-11-19', fri: '2026-11-20' }; // the days in DAYS

// Bogotá is UTC-5 all year, so times go out in UTC and need no VTIMEZONE block
const utc = (day: string, time: string) => {
	if (!DATES[day]) throw new Error(`Unknown day: ${day}`);
	return new Date(`${DATES[day]}T${time}:00-05:00`).toISOString().replace(/[-:]|\.\d+/g, '');
};
const text = (value: string) => value.replace(/[\\;,]/g, '\\$&').replace(/\n/g, '\\n');

// RFC 5545: no line longer than 75 bytes; the rest continues on a line that starts with a space
const fold = (line: string) => {
	let out = '';
	let size = 0;
	for (const char of line) {
		const bytes = new TextEncoder().encode(char).length;
		if (size + bytes > 75) {
			out += '\r\n ';
			size = 1;
		}
		out += char;
		size += bytes;
	}
	return out;
};

export const GET: APIRoute = () => {
	const now = new Date().toISOString().replace(/[-:]|\.\d+/g, '');
	const lines = [
		'BEGIN:VCALENDAR',
		'VERSION:2.0',
		'PRODID:-//Semana de Sistemas//ES',
		'CALSCALE:GREGORIAN',
		'METHOD:PUBLISH',
		'X-WR-CALNAME:Semana de Sistemas 2026',
		'X-WR-TIMEZONE:America/Bogota',
		...ACTIVITIES.flatMap((activity) => {
			const page = `${SITE}/evento.html?id=${activity.id}`;
			const place = [activity.place, activity.place !== 'Virtual' && 'Facultad de Minas, UNAL Medellín'].filter(Boolean).join(', ');
			const about = (activity.description || activity.summary || '').split('\n')[0];
			return [
				'BEGIN:VEVENT',
				`UID:${activity.id}@semanasistemas.vercel.app`,
				`DTSTAMP:${now}`,
				`DTSTART:${utc(activity.day, activity.start)}`,
				`DTEND:${utc(activity.day, activity.end)}`,
				`SUMMARY:${text(activity.title)}`,
				`LOCATION:${text(place)}`,
				`DESCRIPTION:${text(`${about}\n\nMás información: ${page}`)}`,
				`URL:${page}`,
				'END:VEVENT',
			];
		}),
		'END:VCALENDAR',
	];
	return new Response(lines.map(fold).join('\r\n') + '\r\n', { headers: { 'Content-Type': 'text/calendar; charset=utf-8' } });
};
