'use client';

import { useQuery } from '@tanstack/react-query';
import * as api from '@/lib/api';
import type { Classification } from '@/types';

export function useActiveRecord() {
  return useQuery({
    queryKey: ['active-record'],
    queryFn: api.getActiveRecord,
    refetchInterval: 20_000,
  });
}

export function useCategories() {
  return useQuery({ queryKey: ['categories'], queryFn: api.listCategories });
}

export function useTemplates() {
  return useQuery({ queryKey: ['templates'], queryFn: api.listTemplates });
}

export function useTags() {
  return useQuery({ queryKey: ['tags'], queryFn: api.listTags });
}

export function useSchedules(dateKey?: string) {
  return useQuery({
    queryKey: ['schedules', dateKey ?? 'all'],
    queryFn: () => api.listSchedules(dateKey),
  });
}

export function useRoom() {
  return useQuery({
    queryKey: ['room'],
    queryFn: api.getRoom,
    refetchInterval: 15_000,
  });
}

export function usePartner() {
  return useQuery({
    queryKey: ['partner'],
    queryFn: api.getPartnerPresence,
    refetchInterval: 15_000,
  });
}

export function usePartnerHistory() {
  return useQuery({
    queryKey: ['partner-history'],
    queryFn: api.getPartnerHistory,
    staleTime: 30_000,
  });
}

export function usePartnerWeekTrend(dateKey: string) {
  return useQuery({
    queryKey: ['partner-week-trend', dateKey],
    queryFn: () => api.getPartnerWeekTrend(dateKey),
  });
}

export function usePartnerCategoryBreakdown(range?: { from?: string; to?: string }) {
  return useQuery({
    queryKey: ['partner-category-breakdown', range?.from ?? 'all', range?.to ?? 'all'],
    queryFn: () => api.getPartnerCategoryBreakdown(range),
  });
}

export function usePartnerActivityBreakdown(range?: { from?: string; to?: string }) {
  return useQuery({
    queryKey: ['partner-activity-breakdown', range?.from ?? 'all', range?.to ?? 'all'],
    queryFn: () => api.getPartnerActivityBreakdown(range),
  });
}

export function useNotifications() {
  return useQuery({ queryKey: ['notifications'], queryFn: api.listNotifications });
}

export function useDayBreakdown(dateKey: string) {
  return useQuery({
    queryKey: ['breakdown', dateKey],
    queryFn: () => api.getDayBreakdown(dateKey),
  });
}

export function useWeekTrend(dateKey: string) {
  return useQuery({
    queryKey: ['week-trend', dateKey],
    queryFn: () => api.getWeekTrend(dateKey),
  });
}

export function useCategoryBreakdown(range?: { from?: string; to?: string }) {
  return useQuery({
    queryKey: ['category-breakdown', range?.from ?? 'all', range?.to ?? 'all'],
    queryFn: () => api.getCategoryBreakdown(range),
  });
}

export function useActivityBreakdown(range?: { from?: string; to?: string }) {
  return useQuery({
    queryKey: ['activity-breakdown', range?.from ?? 'all', range?.to ?? 'all'],
    queryFn: () => api.getActivityBreakdown(range),
  });
}

export function useTimeline(dateKey: string) {
  return useQuery({
    queryKey: ['timeline', dateKey],
    queryFn: () => api.getTimeline(dateKey),
  });
}

export type ClassificationFilter = Classification | 'ALL';
