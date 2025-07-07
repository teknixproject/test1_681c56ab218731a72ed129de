/* eslint-disable @typescript-eslint/no-unused-vars */
/** @jsxImportSource @emotion/react */
import _ from 'lodash';
import { FC, memo, useMemo } from 'react';
import isEqual from 'react-fast-compare';
import { Controller, FormProvider, useForm, useFormContext } from 'react-hook-form';

import { useActions } from '@/hooks/useActions';
import { useHandleData } from '@/hooks/useHandleData';
import { useHandleProps } from '@/hooks/useHandleProps';
import { stateManagementStore } from '@/stores';
import { TTriggerActions } from '@/types';
import { GridItem } from '@/types/gridItem';
import { getComponentType } from '@/uitls/component';
import { convertToEmotionStyle } from '@/uitls/styleInline';
import { css } from '@emotion/react';

import { componentRegistry, convertProps } from './ListComponent';
import LoadingPage from './loadingPage';

type TProps = {
  data: GridItem;
  valueStream?: any;
  formKeys?: { key: string; value: string }[];
};

// Custom hook to extract common logic
const useRenderItem = (data: GridItem, valueStream?: any) => {
  console.log('🚀 ~ useRenderItem ~ valueStream:', valueStream);
  const { isForm, isNoChildren, isChart, isFeebBack } = getComponentType(data?.value || '');
  const { findVariable } = stateManagementStore();
  const { getData, dataState } = useHandleData({ dataProp: data?.data });
  const actionsProp = useMemo(
    () => data?.componentProps?.dataProps || [],
    [data?.componentProps?.dataProps]
  );
  const { multiples } = useHandleProps({ actionsProp });
  const { handleAction, isLoading } = useActions(data);

  const valueType = useMemo(() => data?.value?.toLowerCase() || '', [data?.value]);

  const Component = useMemo(
    () => (valueType ? _.get(componentRegistry, valueType) || 'div' : 'div'),
    [valueType]
  );

  const propsCpn = useMemo(() => {
    const staticProps = {
      ...convertProps({ data, getData, dataState, valueStream }),
      onClick: () => handleAction('onClick'),
      onChange: () => handleAction('onChange'),
    };

    const cssMultiple = css`
      ${convertToEmotionStyle(staticProps?.styleMultiple)}
    `;
    staticProps.css = cssMultiple;
    const dynamicProps = Object.entries(data?.componentProps?.actions || {}).reduce(
      (acc, [eventName, actionObj]) => {
        acc[eventName] = () => handleAction('onClick', actionObj as TTriggerActions);
        return acc;
      },
      {} as Record<string, any>
    );
    const result = {
      ...staticProps,
      ...dynamicProps,
      ...multiples,
    };
    if (isNoChildren && 'children' in result) {
      delete result.children;
    }
    console.log(`🚀 ~ propsCpn ~ ${data.id}:`, result);

    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, getData, dataState, valueStream, multiples, handleAction]);

  return {
    isLoading,
    valueType,
    Component,
    propsCpn,
    findVariable,
    dataState,
    getData,
  };
};

// Generic component renderer
const ComponentRenderer: FC<{
  Component: any;
  propsCpn: any;
  data: GridItem;
  children?: React.ReactNode;
}> = ({ Component, propsCpn, data, children }) => (
  <Component {...propsCpn}>{!_.isEmpty(data?.childs) ? children : propsCpn.children}</Component>
);

const RenderSliceItem: FC<TProps> = (props) => {
  const { data, valueStream } = props;
  const { isLoading, valueType, Component, propsCpn, dataState } = useRenderItem(data, valueStream);
  const { isForm, isNoChildren, isChart, isFeebBack } = getComponentType(data?.value || '');
  if (!valueType) return <div></div>;
  if (isLoading) return <LoadingPage />;
  if (isForm) return <RenderForm {...props} />;
  if (isNoChildren || isChart) return <Component {...propsCpn} />;

  return (
    <ComponentRenderer Component={Component} propsCpn={propsCpn} data={data}>
      {data?.childs?.map((child) => (
        <RenderSliceItem {...props} data={child} key={String(child.id)} />
      ))}
    </ComponentRenderer>
  );
};

const RenderForm: FC<TProps> = (props) => {
  const { data, valueStream } = props;
  const { isLoading, valueType, Component, propsCpn, dataState } = useRenderItem(data, valueStream);

  const methods = useForm({
    values: dataState,
  });
  const { handleSubmit } = methods;
  const { handleAction } = useActions();
  const formKeys = data?.componentProps?.formKeys;

  const onSubmit = (formData: any) => {
    handleAction('onSubmit', data?.actions, formData);
  };
  if (!valueType) return <div></div>;
  if (isLoading) return <LoadingPage />;

  return (
    <FormProvider {...methods}>
      <ComponentRenderer
        Component={Component}
        propsCpn={{ ...propsCpn, onFinish: () => handleSubmit(onSubmit)() }}
        data={data}
      >
        {data?.childs?.map((child) => (
          <RenderFormItem {...props} data={child} key={String(child.id)} formKeys={formKeys} />
        ))}
      </ComponentRenderer>
    </FormProvider>
  );
};

const RenderFormItem: FC<TProps> = (props) => {
  const { data, formKeys, valueStream } = props;

  const { findVariable } = stateManagementStore();
  const { getData, dataState } = useHandleData({ dataProp: data?.data });
  const { control } = useFormContext();
  const { isInput } = getComponentType(data?.value || '');

  const valueType = useMemo(() => data?.value?.toLowerCase() || '', [data?.value]);
  const Component = useMemo(
    () => (valueType ? _.get(componentRegistry, valueType) || 'div' : 'div'),
    [valueType]
  );

  const propsCpn = useMemo(() => {
    const result = convertProps({ data, getData, dataState, valueStream });
    return result;
  }, [data, dataState, valueStream, getData]);

  if (!valueType) return <div></div>;

  if (isInput) {
    const inFormKeys = formKeys?.find((item) => item?.value === data?.name);

    if (inFormKeys) {
      return (
        <Controller
          control={control}
          name={inFormKeys.key}
          render={({ field }) => <Component {...propsCpn} {...field} />}
        />
      );
    }
    return <Component {...propsCpn} />;
  }

  return (
    <ComponentRenderer Component={Component} propsCpn={propsCpn} data={data}>
      {data?.childs?.map((child) => (
        <RenderFormItem {...props} data={child} key={String(child.id)} />
      ))}
    </ComponentRenderer>
  );
};

export default memo(RenderSliceItem, isEqual);
