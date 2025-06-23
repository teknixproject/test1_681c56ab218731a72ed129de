/* eslint-disable react-hooks/exhaustive-deps */
import _ from 'lodash';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { useConstructorDataAPI, usePreviewUI } from '@/app/actions/use-constructor';
import { getDeviceType } from '@/lib/utils';
import { apiCallService, stateManagerService } from '@/services';
import { authSettingService } from '@/services/authSetting';
import { customFunctionService } from '@/services/customFunctionService';
import { documentService } from '@/services/document';
import { apiResourceStore, stateManagementStore } from '@/stores';
import { authSettingStore } from '@/stores/authSetting';
import { customFunctionStore } from '@/stores/customFunction';
import { TAuthSetting, TTypeSelect, TTypeSelectState, TVariable, TVariableMap } from '@/types';
import { getMatchingRoutePattern } from '@/uitls/pathname';

type DeviceType = 'mobile' | 'desktop';

//#region State Preview
export const useInitStatePreview = () => {
  const searchParams = useSearchParams();
  const uid = searchParams.get('uid');
  const customWidgetName = searchParams.get('customWidgetName');
  const projectId = searchParams.get('projectId');
  const sectionName = searchParams.get('sectionName');
  const userId = searchParams.get('userId');
  const setCustomFunctions = customFunctionStore((state) => state.setCustomFunctions);

  //#region store
  const { addAndUpdateApiResource } = apiResourceStore();
  const { setStateManagement } = stateManagementStore();
  const resetAuthSettings = authSettingStore((state) => state.reset);

  // #region hooks
  const [deviceType, setDeviceType] = useState(getDeviceType());
  const { dataPreviewUI, isLoading } = usePreviewUI(projectId ?? '', uid, sectionName, userId);

  // #region state
  const isPage = _.get(dataPreviewUI, 'typePreview') === 'page';
  const state = _.get(dataPreviewUI, 'state');

  const headerLayout = dataPreviewUI?.headerLayout?.layoutJson || dataPreviewUI?.headerLayout;
  const bodyLayout = dataPreviewUI?.bodyLayout?.layoutJson || dataPreviewUI?.bodyLayout;
  const footerLayout = dataPreviewUI?.footerLayout?.layoutJson || dataPreviewUI?.footerLayout;

  const selectedHeaderLayout = !_.isEmpty(headerLayout) ? headerLayout[deviceType] : {};
  const selectedBodyLayout = !_.isEmpty(bodyLayout) ? bodyLayout[deviceType] : {};
  const selectedFooterLayout = !_.isEmpty(footerLayout) ? footerLayout[deviceType] : {};

  //#region function
  useEffect(() => {
    const handleResize = () => setDeviceType(getDeviceType());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // const getActions = async () => {
  //   try {
  //     const result = await actionService.getData({
  //       uid: uid || process.env.NEXT_PUBLIC_DEFAULT_UID || '',
  //       projectId: projectId || process.env.NEXT_PUBLIC_PROJECT_ID || '',
  //     });
  //     if (_.isEmpty(result?.data)) return;
  //     setActions(result.data);
  //   } catch (error) {
  //     console.log('🚀 ~ getStates ~ error:', error);
  //   }
  // };

  const getApiCall = async () => {
    try {
      const result = await apiCallService.getAll({
        projectId: projectId || process.env.NEXT_PUBLIC_PROJECT_ID || '',
      });
      addAndUpdateApiResource({ apis: result?.data?.apis });
    } catch (error) {
      console.log('🚀 ~ getApiCall ~ error:', error);
    }
  };
  const getAuthSettings = async () => {
    try {
      const result = await authSettingService.get({ projectId: projectId || '' });
      resetAuthSettings(result?.data);
    } catch (error) {
      console.log('🚀 ~ getAuthSettings ~ error:', error);
    }
  };
  const getCustomFunctions = async () => {
    try {
      const result = await customFunctionService.getAll({
        uid: uid || '',
        projectId: projectId || process.env.NEXT_PUBLIC_PROJECT_ID || '',
      });
      setCustomFunctions(result.data);
    } catch (error) {
      console.log('🚀 ~ getCustomFunctions ~ error:', error);
    }
  };

  const setStateFormDataPreview = () => {
    if (!_.isEmpty(state)) {
      ['appState', 'globalState', 'componentState', 'apiResponse', 'dynamicGenerate'].forEach(
        (type) => {
          setStateManagement({
            type: type as TTypeSelect,
            dataUpdate: state[type],
          });
        }
      );
    }
  };

  useEffect(() => {
    async function fetchData() {
      await Promise.all([
        setStateFormDataPreview(),
        // getActions(),
        getApiCall(),
        getCustomFunctions(),
        getAuthSettings(),
      ]);
    }
    fetchData();
  }, [uid, projectId, bodyLayout]);

  return {
    isPage,
    customWidgetName,
    deviceType,
    selectedHeaderLayout,
    selectedBodyLayout,
    selectedFooterLayout,
    isLoading,
  };
};

//#region State Render
const projectId = process.env.NEXT_PUBLIC_PROJECT_ID;
export const useInitStateRender = () => {
  const pathname = usePathname(); // /detail/123
  const matchingPattern = useRef<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      const result = await documentService.getAllPageNames(projectId || '');
      const uids = result?.data?.map((item: any) => item.uid) || [];

      const matched = getMatchingRoutePattern(pathname, uids);
      matchingPattern.current = matched;
    }
    fetchData();
  }, [pathname]);

  const { addAndUpdateApiResource } = apiResourceStore();
  const { setStateManagement, findVariable } = stateManagementStore();
  const resetAuthSettings = authSettingStore((state) => state.reset);

  const router = useRouter();

  const uid = matchingPattern.current;

  const setCustomFunctions = customFunctionStore((state) => state.setCustomFunctions);
  const { enable, pages, entryPage } = authSettingStore();
  const { bodyLayout, isLoading } = useConstructorDataAPI(uid || '/');

  const [deviceType, setDeviceType] = useState<DeviceType>(getDeviceType());
  const selectedBodyLayout = bodyLayout[deviceType] ?? bodyLayout ?? {};

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => {
      setDeviceType(getDeviceType());
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const getStates = async () => {
    const list: TTypeSelectState[] = [
      'parameters',
      'appState',
      'componentState',
      'globalState',
      'apiResponse',
      'dynamicGenerate',
    ];
    try {
      await Promise.all(
        list.map(async (type: TTypeSelectState) => {
          const result = await stateManagerService.getData(
            type === 'globalState'
              ? {
                  projectId: projectId || process.env.NEXT_PUBLIC_PROJECT_ID || '',
                  type,
                }
              : {
                  uid: uid ?? '/',
                  projectId: projectId || process.env.NEXT_PUBLIC_PROJECT_ID || '',
                  type,
                }
          );
          if (_.isEmpty(result?.data)) return;
          const { state } = result?.data;
          if (_.isEmpty(state)) return;

          if (state) {
            setStateManagement({
              type,
              dataUpdate: state.reduce((acc: TVariableMap, item: TVariable) => {
                return {
                  ...acc,
                  [item.id]: item,
                };
              }, {}),
            });
          }
        })
      );
    } catch (error) {
      console.log('🚀 ~ getStates ~ error:', error);
    }
  };

  // const getActions = async () => {
  //   try {
  //     const result = await actionService.getData({
  //       uid: uid,
  //       projectId: projectId || process.env.NEXT_PUBLIC_PROJECT_ID || '',
  //     });
  //     if (_.isEmpty(result?.data?.data)) return;
  //     setActions(result.data.data);
  //   } catch (error) {
  //     console.log('🚀 ~ getStates ~ error:', error);
  //   }
  // };

  const getApiCall = async () => {
    try {
      const result = await apiCallService.getAll({
        projectId: projectId || process.env.NEXT_PUBLIC_PROJECT_ID || '',
      });
      addAndUpdateApiResource({ apis: result?.data?.apis });
    } catch (error) {
      console.log('🚀 ~ getApiCall ~ error:', error);
    }
  };
  const getCustomFunctions = async () => {
    try {
      const result = await customFunctionService.getAll({
        uid: uid || '',
        projectId: projectId || process.env.NEXT_PUBLIC_PROJECT_ID || '',
      });
      setCustomFunctions(result.data);
    } catch (error) {
      console.log('🚀 ~ getCustomFunctions ~ error:', error);
    }
  };
  const getAuthSettings = async () => {
    try {
      const result = await authSettingService.get({ projectId });
      resetAuthSettings(result?.data);
    } catch (error) {
      console.log('🚀 ~ getAuthSettings ~ error:', error);
    }
  };
  useEffect(() => {
    if (enable) {
      const pageRole = pages.find(
        (item: TAuthSetting['pages'][number]) => item.documentId.uid === pathname
      );
      if (pageRole?.required) {
        const roles = pageRole?.roles?.map((item) => item.value);
        const role = localStorage.getItem('role') || localStorage.getItem('ROLE') || '';
        const check = () => {
          return roles?.includes(role);
        };
        const checkRole = check();

        if (!checkRole) {
          if (entryPage) {
            router.push(entryPage);
          }
        }
      }
    }
  }, [enable, findVariable, entryPage, pages, pathname, router]);
  useEffect(() => {
    if (!projectId) return;
    async function fetchData() {
      await Promise.all([getStates(), getApiCall(), getCustomFunctions(), getAuthSettings()]);
    }
    fetchData();
  }, [uid, projectId]);

  return {
    isLoading,
    selectedBodyLayout,
    deviceType,
  };
};
