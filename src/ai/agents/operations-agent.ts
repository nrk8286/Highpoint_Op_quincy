/**
 * @fileOverview Operations & Scheduling Agent - Manages maintenance, work orders, and resources
 */

import { BaseAgent } from './base-agent';
import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import type { AgentTask, AgentConfig } from './types';

const OperationsResponseSchema = z.object({
  action_taken: z.string(),
  work_orders: z.array(
    z.object({
      id: z.string(),
      type: z.string(),
      priority: z.enum(['low', 'medium', 'high', 'urgent']),
      description: z.string(),
      assigned_to: z.string().optional(),
      estimated_time: z.string().optional(),
    })
  ).optional(),
  schedule_updates: z.array(
    z.object({
      item: z.string(),
      scheduled_date: z.string(),
      assigned_to: z.string().optional(),
    })
  ).optional(),
  resource_allocations: z.array(
    z.object({
      resource: z.string(),
      quantity: z.number(),
      purpose: z.string(),
    })
  ).optional(),
  summary: z.string(),
});

/**
 * Operations Agent manages day-to-day facility operations
 */
export class OperationsAgent extends BaseAgent {
  constructor() {
    const config: AgentConfig = {
      id: 'operations_001',
      role: 'operations',
      name: 'Operations & Scheduling Manager',
      description: 'Manages maintenance schedules, work orders, inventory, and resource allocation',
      model: 'gemini',
      systemPrompt: `You are the Operations Agent in a facility management system.

Your responsibilities:
1. Manage maintenance schedules (preventive and reactive)
2. Create and assign work orders
3. Monitor inventory levels and trigger reorders
4. Allocate resources efficiently
5. Schedule staff and contractors
6. Respond to maintenance requests via natural language

When managing operations:
- Prioritize based on urgency and impact
- Consider resource availability
- Optimize schedules to minimize downtime
- Balance preventive and reactive maintenance
- Track inventory usage and forecast needs
- Ensure proper staff allocation

You have access to:
- Work order system
- Maintenance schedules
- Inventory database
- Staff availability
- Asset information
- Historical maintenance data`,
      capabilities: [
        'maintenance_scheduling',
        'work_order_management',
        'inventory_control',
        'resource_allocation',
        'staff_scheduling',
      ],
      temperature: 0.7,
    };

    super(config);
    this.registerOperationsTools();
  }

  /**
   * Register operations-specific tools
   */
  private registerOperationsTools(): void {
    // Tool: Create work order
    this.registerTool({
      name: 'create_work_order',
      description: 'Create a new maintenance work order',
      parameters: z.object({
        location: z.string(),
        issue_type: z.string(),
        description: z.string(),
        priority: z.enum(['low', 'medium', 'high', 'urgent']),
        assigned_to: z.string().optional(),
      }),
      execute: async (params) => {
        // In production, this would create work order in database
        return {
          work_order_id: `wo_${Date.now()}`,
          ...params,
          status: 'open',
          created_at: new Date().toISOString(),
        };
      },
    });

    // Tool: Schedule maintenance
    this.registerTool({
      name: 'schedule_maintenance',
      description: 'Schedule preventive maintenance',
      parameters: z.object({
        asset_id: z.string(),
        maintenance_type: z.string(),
        date: z.string(),
        assigned_to: z.string().optional(),
      }),
      execute: async (params) => {
        // In production, this would update maintenance schedule
        return {
          schedule_id: `sched_${Date.now()}`,
          ...params,
          status: 'scheduled',
        };
      },
    });

    // Tool: Check inventory
    this.registerTool({
      name: 'check_inventory',
      description: 'Check inventory levels for items',
      parameters: z.object({
        item_name: z.string().optional(),
        category: z.string().optional(),
      }),
      execute: async (params) => {
        // In production, this would query inventory database
        return {
          items: [
            {
              name: params.item_name || 'Sample Item',
              quantity: 50,
              reorder_level: 20,
              status: 'in_stock',
            },
          ],
        };
      },
    });

    // Tool: Reorder inventory
    this.registerTool({
      name: 'reorder_inventory',
      description: 'Trigger reorder for inventory items',
      parameters: z.object({
        item_id: z.string(),
        quantity: z.number(),
        urgency: z.enum(['standard', 'expedited', 'urgent']),
      }),
      execute: async (params) => {
        // In production, this would create purchase order
        return {
          order_id: `order_${Date.now()}`,
          ...params,
          status: 'ordered',
          estimated_delivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        };
      },
    });

    // Tool: Allocate resources
    this.registerTool({
      name: 'allocate_resources',
      description: 'Allocate staff or equipment resources',
      parameters: z.object({
        resource_type: z.enum(['staff', 'equipment', 'supplies']),
        resource_id: z.string(),
        task_id: z.string(),
        duration: z.string().optional(),
      }),
      execute: async (params) => {
        // In production, this would update resource allocation
        return {
          allocation_id: `alloc_${Date.now()}`,
          ...params,
          status: 'allocated',
        };
      },
    });
  }

  /**
   * Process operations task
   */
  async processTask(task: AgentTask): Promise<any> {
    this.setStatus('thinking');

    const prompt = this.generatePrompt(
      `Perform the following operations task:

Task: ${task.description}
Priority: ${task.priority}
Context: ${JSON.stringify(task.context || {})}

Determine what actions need to be taken, create any necessary work orders, update schedules, and allocate resources as needed.`,
      { includeMemory: true, includeTools: true }
    );

    const operationsPrompt = ai.definePrompt({
      name: 'operationsManagement',
      input: { schema: z.object({ prompt: z.string() }) },
      output: { schema: OperationsResponseSchema },
      prompt: '{{prompt}}',
    });

    const { output } = await operationsPrompt({ prompt });

    if (!output) {
      throw new Error('Failed to process operations task');
    }

    // Execute any work order creations
    if (output.work_orders && output.work_orders.length > 0) {
      for (const wo of output.work_orders) {
        try {
          await this.executeTool('create_work_order', {
            location: wo.description, // Simplified
            issue_type: wo.type,
            description: wo.description,
            priority: wo.priority,
            assigned_to: wo.assigned_to,
          });
        } catch (error) {
          this.addMemory({
            type: 'observation',
            content: `Failed to create work order: ${error}`,
          });
        }
      }
    }

    this.addMemory({
      type: 'decision',
      content: `Operations task completed: ${output.summary}`,
      metadata: { taskId: task.id },
    });

    this.setStatus('completed');
    return output;
  }

  /**
   * Auto-schedule preventive maintenance
   */
  async autoScheduleMaintenance(): Promise<any> {
    const task: AgentTask = {
      id: `auto_maint_${Date.now()}`,
      type: 'preventive_maintenance',
      priority: 'medium',
      status: 'in_progress',
      description: 'Analyze assets and schedule preventive maintenance to reduce downtime',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    return this.processTask(task);
  }

  /**
   * Monitor inventory and trigger reorders
   */
  async monitorInventory(): Promise<any> {
    const inventory = await this.executeTool('check_inventory', {});

    const lowStockItems = inventory.items.filter(
      (item: any) => item.quantity <= item.reorder_level
    );

    if (lowStockItems.length > 0) {
      const reorders = [];
      for (const item of lowStockItems) {
        const reorder = await this.executeTool('reorder_inventory', {
          item_id: item.name,
          quantity: item.reorder_level * 2,
          urgency: 'standard',
        });
        reorders.push(reorder);
      }

      return {
        low_stock_count: lowStockItems.length,
        reorders_placed: reorders.length,
        reorders,
      };
    }

    return {
      status: 'all_items_in_stock',
      low_stock_count: 0,
    };
  }
}
