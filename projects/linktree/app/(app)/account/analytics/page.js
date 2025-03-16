import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import Graf from '@/components/Graf';
import SectionBox from '@/components/layout/SectionBox';
import connectToDatabase from '@/lib/connectToDB';
import Event from '@/models/Event';
import Page from '@/models/Page';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { format, addDays, isBefore, isEqual, parseISO } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLink } from '@fortawesome/free-solid-svg-icons';
import Link from 'next/link';

const AnalyticsPage = async () => {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect('/');
  }
  await connectToDatabase();
  const page = await Page?.findOne({ owner: session?.user?.email });

  const groupedViews = await Event.aggregate([
    {
      $match: {
        type: 'view',
        url: page.uri,
      },
    },
    {
      $group: {
        _id: {
          $dateToString: {
            date: '$createdAt',
            format: '%Y-%m-%d',
          },
        },
        count: {
          $count: {},
        },
      },
    },
  ]);
  const clicks = await Event.find({
    page: page.uri,
    type: 'click',
  });

  // Determine the start and end dates from the data
  const dates = groupedViews.map(({ _id }) => parseISO(_id));
  const startDate = dates.length > 0 ? dates.reduce((a, b) => (isBefore(a, b) ? a : b)) : new Date();
  const endDate = dates.length > 0 ? dates.reduce((a, b) => (isBefore(a, b) ? b : a)) : new Date();

  // Fill in missing dates with a count of 0
  const dateCounts = {};
  groupedViews.forEach(({ _id: date, count }) => {
    dateCounts[date] = count;
  });

  const grafData = [['Day', 'Clicks']];
  for (let date = startDate; isBefore(date, endDate) || isEqual(date, endDate); date = addDays(date, 1)) {
    const formattedDate = format(date, 'yyyy-MM-dd');
    grafData.push([formattedDate, dateCounts[formattedDate] || 0]);
  }

  // Add these helper functions before the component
  const isSameDay = (date1, date2) => {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    return d1.getDate() === d2.getDate() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getFullYear() === d2.getFullYear();
  };
  // Add this before the return statement
  const getTodayClicks = (linkUrl) => {
    const today = new Date();
    return clicks.filter(c => {
      try {
        return c.url === linkUrl && isSameDay(c.createdAt, today);
      } catch (e) {
        console.error('Error processing click:', e);
        return false;
      }
    }).length;
  };

  const getAllTimeClicks = (linkUrl) => {
    return clicks.filter(c => c.url === linkUrl).length;
  };
  return (
    <div>
      <SectionBox>
        <h2 className="text-xl mb-4 text-center">
          Views
        </h2>
        <Graf data={grafData} />
      </SectionBox>
      <SectionBox>
        <h2 className="text-xl mb-4 text-center">Clicks</h2>
        {page.links.map(link => (
          <div key={uuidv4()} className='border-t gap-4 items-center md:flex border-gray-200 py-4'>
            <div className='text-blue-500 pl-4'>
              <FontAwesomeIcon icon={faLink} />
            </div>
            <div className='grow'>
              <h3>{link.title || 'No Title'}</h3>
              <p className='text-gray-700 text-md'>{link.subtitle || 'No Subtitle'}</p>
              <Link className='text-xs text-blue-400' target='_blank' href={link.url}>{link.url}</Link>
            </div>
            <div className='border border-gray-100  rounded-md mt-1 md:mt-0 p-2'>


              <div className='text-center'>
                <div className="text-3xl">
                  {getTodayClicks(link.url)}
                </div>
                <div className="text-gray-400 text-xs font-bold uppercase">Today Clicks</div>
              </div>
            </div>
            <div className='border border-gray-100  rounded-md mt-1 md:mt-0 p-2'>
              <div className="text-center">
                <div className="text-3xl">
                  {getAllTimeClicks(link.url)}
                </div>
                <div className="text-gray-400 text-xs font-bold uppercase">All time Clicks</div>
              </div>
            </div>
          </div>
        ))}
      </SectionBox>
    </div>
  );
};

export default AnalyticsPage;