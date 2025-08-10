export default function SessionListSkeleton() {
	return (
		<div className='space-y-3'>
			<div className='skeleton' style={{ height: 40 }} />
			<div className='card p-4 space-y-2'>
				{[...Array(3)].map((_, i) => (
					<div key={i} className='skeleton' style={{ height: 16 }} />
				))}
			</div>
			<div className='card p-4 space-y-2'>
				{[...Array(3)].map((_, i) => (
					<div key={i} className='skeleton' style={{ height: 16 }} />
				))}
			</div>
		</div>
	);
}
