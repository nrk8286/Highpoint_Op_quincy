'use client';

import * as React from 'react';
import { useFormStatus } from 'react-dom';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Bot, FileDown } from 'lucide-react';
import { DateRange } from 'react-day-picker';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { generateReportAction, FormState } from './actions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full sm:w-auto">
      {pending ? (
        <>
          <Bot className="mr-2 h-4 w-4 animate-spin" />
          Generating...
        </>
      ) : (
        <>
          <Bot className="mr-2 h-4 w-4" />
          Generate Report
        </>
      )}
    </Button>
  );
}

export function AuditReportForm() {
  const [date, setDate] = React.useState<DateRange | undefined>({
    from: new Date(new Date().setMonth(new Date().getMonth() - 1)),
    to: new Date(),
  });

  const initialState: FormState = { message: '' };
  const [state, dispatch] = React.useActionState(generateReportAction, initialState);

  return (
    <div className="space-y-6">
      <form action={dispatch} className="space-y-4">
        <div className="grid w-full items-center gap-2">
            <input type="hidden" name="dateRange.from" value={date?.from?.toISOString()} />
            <input type="hidden" name="dateRange.to" value={date?.to?.toISOString()} />
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id="date"
                variant={'outline'}
                className={cn(
                  'w-full justify-start text-left font-normal',
                  !date && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date?.from ? (
                  date.to ? (
                    <>
                      {format(date.from, 'LLL dd, y')} -{' '}
                      {format(date.to, 'LLL dd, y')}
                    </>
                  ) : (
                    format(date.from, 'LLL dd, y')
                  )
                ) : (
                  <span>Pick a date range</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={date?.from}
                selected={date}
                onSelect={setDate}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
        </div>
        <SubmitButton />
      </form>
      
      {state.message && !state.report && (
        <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      )}
      
      {state.report && (
        <div className="space-y-4">
          <div className='flex justify-between items-center'>
            <h3 className="text-xl font-semibold font-headline">Generated Report Draft</h3>
            <Button variant="outline"><FileDown className="mr-2 h-4 w-4"/>Export PDF</Button>
          </div>
          <div className="prose prose-sm dark:prose-invert max-w-none p-6 border rounded-lg bg-muted/50">
            <pre className="whitespace-pre-wrap font-body text-sm bg-transparent p-0 border-0">
                {state.report}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
