import { BarChart, SankeyChart, TreemapChart } from 'echarts/charts';
import { PolarComponent } from 'echarts/components';
import * as echarts from 'echarts/core';

// Dashboard-only chart types stay behind the lazy dashboard route chunk.
echarts.use([BarChart, PolarComponent, SankeyChart, TreemapChart]);
