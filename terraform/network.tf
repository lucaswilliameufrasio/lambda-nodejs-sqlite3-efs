data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

data "aws_subnet" "default_detail" {
  for_each = toset(data.aws_subnets.default.ids)
  id       = each.value
}

locals {
  subnets_by_az = merge([
    for s in data.aws_subnet.default_detail : {
      (s.availability_zone) = s.id
    }
  ]...)
}

resource "aws_security_group" "lambda" {
  name        = "${local.prefix}-lambda-sg"
  vpc_id      = data.aws_vpc.default.id
  description = "Allow outbound traffic for Lambda"

  egress {
    description = "all"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = local.tags
}

resource "aws_security_group" "efs" {
  name        = "${local.prefix}-efs-sg"
  description = "Allow NFS traffic from Lambda to EFS"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    from_port       = 2049
    to_port         = 2049
    protocol        = "tcp"
    security_groups = [aws_security_group.lambda.id]
    description     = "NFS from Lambda"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = local.tags
}
