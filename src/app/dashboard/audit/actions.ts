'use server';

import { generateAuditReport } from "@/ai/flows/generate-audit-report";
import { z } from "zod";

const FormSchema = z.object({
    dateRange: z.object({
        from: z.date(),
        to: z.date().optional(),
    })
});

export type FormState = {
    message: string;
    report?: string;
}

export async function generateReportAction(
    prevState: FormState,
    formData: FormData
): Promise<FormState> {
    const rawData = {
        dateRange: {
            from: new Date(formData.get('dateRange.from') as string),
            to: formData.get('dateRange.to') ? new Date(formData.get('dateRange.to') as string) : undefined
        }
    }
    const validatedFields = FormSchema.safeParse(rawData);
    
    if (!validatedFields.success) {
        return {
            message: 'Invalid form data. Please select a valid date range.',
        }
    }

    const { from, to } = validatedFields.data.dateRange;

    if (!to) {
        return {
            message: 'Please select an end date for the range.'
        }
    }

    try {
        const result = await generateAuditReport({
            dateRangeStart: from.toISOString().split('T')[0],
            dateRangeEnd: to.toISOString().split('T')[0],
        });

        if (result.report) {
            return {
                message: 'Report generated successfully.',
                report: result.report,
            }
        }
        return { message: 'Failed to generate report. No content was returned.' };

    } catch (e) {
        console.error(e);
        const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
        return { message: `Error generating report: ${errorMessage}` };
    }
}
