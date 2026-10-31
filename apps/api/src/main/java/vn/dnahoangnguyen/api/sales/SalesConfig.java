package vn.dnahoangnguyen.api.sales;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;
import vn.dnahoangnguyen.api.sales.bank.SepayProperties;

@Configuration
@EnableConfigurationProperties(SepayProperties.class)
public class SalesConfig {
}
