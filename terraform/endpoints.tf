resource "aws_vpc_endpoint" "sqs" {
  vpc_id            = data.aws_vpc.default.id
  service_name      = "com.amazonaws.${data.aws_region.current.region}.sqs"
  vpc_endpoint_type = "Interface"

  subnet_ids = values(local.subnets_by_az)

  security_group_ids = [aws_security_group.vpc_endpoints.id]

  private_dns_enabled = true

  tags = local.tags
}

resource "aws_security_group" "vpc_endpoints" {
  name        = "${local.prefix}-vpc-endpoints-sg"
  description = "Allow HTTPS traffic to VPC endpoints"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    from_port       = 443
    to_port         = 443
    protocol        = "tcp"
    security_groups = [aws_security_group.lambda.id]
    description     = "HTTPS from Lambda"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = local.tags
}
