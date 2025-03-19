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
    <div className="space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">Analytics</h1>
        <p className="text-slate-600">Track your page views and link clicks</p>
      </div>

      <SectionBox>
        <h2 className="text-xl font-semibold text-slate-800 mb-6 text-center">
          Page Views
        </h2>
        <Graf data={grafData} />
      </SectionBox>

      <SectionBox>
        <h2 className="text-xl font-semibold text-slate-800 mb-6 text-center">Link Analytics</h2>
        <div className="space-y-4">
          {page.links.map(link => (
            <div key={uuidv4()} 
                 className="flex flex-col md:flex-row items-center gap-4 p-4 border-t border-slate-100 first:border-t-0">
              <div className="text-blue-500">
                <FontAwesomeIcon icon={faLink} className="text-lg" />
              </div>
              
              <div className="grow text-center md:text-left">
                <h3 className="font-medium text-slate-800">{link.title || 'No Title'}</h3>
                <p className="text-slate-600 text-sm">{link.subtitle || 'No Subtitle'}</p>
                <Link 
                  className="text-xs text-blue-500 hover:text-blue-600 transition-colors" 
                  target="_blank" 
                  href={link.url}
                >
                  {link.url}
                </Link>
              </div>

              <div className="flex gap-4">
                <div className="bg-white px-6 py-3 rounded-lg border border-slate-100 shadow-sm">
                  <div className="text-3xl font-semibold text-slate-800 mb-1">
                    {getTodayClicks(link.url)}
                  </div>
                  <div className="text-xs font-medium text-slate-500 uppercase">Today</div>
                </div>

                <div className="bg-white px-6 py-3 rounded-lg border border-slate-100 shadow-sm">
                  <div className="text-3xl font-semibold text-slate-800 mb-1">
                    {getAllTimeClicks(link.url)}
                  </div>
                  <div className="text-xs font-medium text-slate-500 uppercase">Total</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </SectionBox>
    </div>
  );
};

export default AnalyticsPage;