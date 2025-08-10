export default function PlayerCardSkeleton() {
	return (
		<div className='card p-3 flex items-center gap-3'>
			<div className='skeleton' style={{ width: 48, height: 48, borderRadius: 8 }} />
			<div className='flex-1 space-y-2'>
				<div className='skeleton' style={{ height: 12, width: '40%' }} />
				<div className='skeleton' style={{ height: 10, width: '60%' }} />
			</div>
			<div className='skeleton' style={{ height: 32, width: 96 }} />
		</div>
	);
}
